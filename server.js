require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { handleRpc } = require('./services/rpcController');
const { initSchema } = require('./db/neonClient');
const mockStore = require('./data/mockStore');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static files (client bridge, assets)
app.use(express.static(path.join(__dirname, 'public')));

// Page Templates Mapping
const pageTemplates = {
  'dashboard': 'index',
  'inventory': 'inventory',
  'suppliers': 'suppliers',
  'customers': 'customers',
  'purchases': 'purchases',
  'sales': 'sales',
  'receipts': 'receipts',
  'payments': 'payments',
  'reports': 'reports'
};

// Render layout + dynamic page
function renderAppPage(pageName) {
  const normalizedPage = (pageName || 'dashboard').toLowerCase();
  const contentTemplate = pageTemplates[normalizedPage] || 'index';

  const layoutPath = path.join(__dirname, 'views', 'template.html');
  let layout = fs.readFileSync(layoutPath, 'utf-8');

  const childPath = path.join(__dirname, 'views', `${contentTemplate}.html`);
  let childContent = fs.existsSync(childPath)
    ? fs.readFileSync(childPath, 'utf-8')
    : '<div style="padding:40px; text-align:center;"><h2>Page Not Found</h2><p>Return to <a href="?page=dashboard">Dashboard</a></p></div>';

  // Sanitize child content to nest cleanly inside template content container
  childContent = childContent
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<base[^>]*>/gi, '')
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<\/?head[^>]*>/gi, '')
    .replace(/<body[^>]*>/gi, '<div class="subpage-content">')
    .replace(/<\/body>/gi, '</div>')
    .replace(/(^|[\s,;{}])body\s*\{/gi, '$1.subpage-content {');

  // Inject client bridge in head
  if (!layout.includes('google-script-bridge.js')) {
    layout = layout.replace('</head>', '  <script src="/google-script-bridge.js"></script>\n</head>');
  }

  // Replace Apps Script script URL
  layout = layout.replace(/<\?=\s*getScriptUrl\(\)\s*\?>/g, () => '');

  // Set active class for current page navigation
  const allNavItems = ['dashboard', 'inventory', 'suppliers', 'customers', 'purchases', 'sales', 'receipts', 'payments', 'reports', 'users', 'settings'];
  allNavItems.forEach(p => {
    const regex = new RegExp(`<\?=\\s*currentPage\\s*===\\s*['"]${p}['"]\\s*\\?\\s*['"]active['"]\\s*:\\s*['"]['"]\\s*\?>`, 'g');
    layout = layout.replace(regex, () => ((normalizedPage === p) ? 'active' : ''));
  });
  layout = layout.replace(/<\?=\s*currentPage[\s\S]*?\?>/g, () => '');

  // Inject child template into content container (use function replacer to prevent $ pattern substitution)
  layout = layout.replace(/<\?!=\s*include\([\s\S]*?\)\s*\?>/g, () => childContent);

  return layout;
}

// Main page route (Supports ?page=xxx and direct routes)
app.get('/', (req, res) => {
  const page = req.query.page || 'dashboard';
  const html = renderAppPage(page);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Direct named routes (e.g. /inventory, /suppliers)
app.get('/:page', (req, res, next) => {
  const page = req.params.page.toLowerCase();
  if (pageTemplates[page] || page === 'users' || page === 'settings') {
    const html = renderAppPage(page);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }
  next();
});

// RPC API Endpoint - Handles all Google Apps Script client calls
app.post('/api/rpc', async (req, res) => {
  const { action, args } = req.body;
  if (!action) {
    return res.status(400).json({ success: false, error: 'Missing action parameter' });
  }

  try {
    const data = await handleRpc(action, args || []);
    return res.json({ success: true, data });
  } catch (err) {
    console.error(`[RPC Error on ${action}]:`, err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
      details: err.stack
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: process.env.DATABASE_URL ? 'Neon PostgreSQL' : 'Local Mock Data',
    timestamp: new Date().toISOString()
  });
});

// Initialize database schema and persistent store if Neon DB is configured
initSchema().then(() => mockStore.initStore()).catch(console.error);

// Export for Vercel serverless deployment
module.exports = app;

// Start server when run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 AIC Inventory App running at http://localhost:${PORT}`);
    console.log(`📊 Mode: ${process.env.DATABASE_URL ? 'Neon PostgreSQL' : 'Local Mock Data Store'}`);
    console.log(`🧭 Pages: Dashboard, Inventory, Suppliers, Customers,`);
    console.log(`          Purchases, Sales, Receipts, Payments, Reports`);
    console.log(`====================================================`);
  });
}
