/**
 * Google Apps Script Client Bridge
 * Emulates `google.script.run` and `google.script.host` for standard web environments
 * Dispatches RPC calls to `/api/rpc`
 */
(function() {
  window.google = window.google || {};
  window.google.script = window.google.script || {};

  function createRunner(handlers) {
    handlers = handlers || {
      success: null,
      failure: null,
      userObject: null
    };

    var runner = {
      _handlers: handlers,
      withSuccessHandler: function(fn) {
        return createRunner({
          success: fn,
          failure: this._handlers.failure,
          userObject: this._handlers.userObject
        });
      },
      withFailureHandler: function(fn) {
        return createRunner({
          success: this._handlers.success,
          failure: fn,
          userObject: this._handlers.userObject
        });
      },
      withUserObject: function(obj) {
        return createRunner({
          success: this._handlers.success,
          failure: this._handlers.failure,
          userObject: obj
        });
      }
    };

    // Return a Proxy to catch all method names invoked on google.script.run
    return new Proxy(runner, {
      get: function(target, prop) {
        if (prop in target || typeof prop !== 'string') {
          return target[prop];
        }

        return function() {
          var args = Array.prototype.slice.call(arguments);
          var successHandler = target._handlers.success;
          var failureHandler = target._handlers.failure;
          var userObj = target._handlers.userObject;

          // Perform RPC POST
          fetch('/api/rpc', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: prop,
              args: args
            })
          })
          .then(function(response) {
            return response.json().then(function(json) {
              if (!response.ok || json.success === false) {
                var err = new Error(json.error || 'Server RPC error: ' + prop);
                if (json.details) err.details = json.details;
                throw err;
              }
              return json.data;
            });
          })
          .then(function(data) {
            if (typeof successHandler === 'function') {
              successHandler(data, userObj);
            }
          })
          .catch(function(err) {
            console.error('[RPC Error] ' + prop + ' failed:', err);
            if (typeof failureHandler === 'function') {
              failureHandler(err, userObj);
            } else {
              console.warn('Unhandled RPC failure in ' + prop + ':', err.message);
            }
          });
        };
      }
    });
  }

  window.google.script.run = createRunner();
  window.google.script.host = {
    close: function() { console.log('google.script.host.close called'); },
    setHeight: function(h) { console.log('google.script.host.setHeight', h); },
    setWidth: function(w) { console.log('google.script.host.setWidth', w); },
    editor: {
      focus: function() {}
    }
  };
  window.google.script.url = {
    getLocation: function(callback) {
      if (typeof callback === 'function') {
        var params = {};
        new URLSearchParams(window.location.search).forEach(function(val, key) {
          params[key] = val;
        });
        callback({
          hash: window.location.hash,
          parameter: params,
          parameters: params
        });
      }
    }
  };

  console.log('[AIC App] Google Apps Script compatibility bridge loaded successfully.');
})();
