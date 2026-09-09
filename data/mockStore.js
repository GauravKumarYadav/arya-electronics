const fs = require('fs');
const path = require('path');
const { getDbPool, loadStoreFromDb, saveStoreToDb } = require('../db/neonClient');

const DATA_FILE = path.join(__dirname, 'mockData.json');

// In-memory clone
let store = null;

function loadStoreSync() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    store = JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local mockData.json, setting default structure:', err);
    store = {
      dimensions: { states: [], cities: [], types: [], categories: [], subcategories: [], pmtStatuses: [], shippingStatuses: [], pmtModes: [] },
      suppliers: [],
      customers: [],
      inventory: [],
      purchaseOrders: [],
      purchaseDetails: [],
      salesOrders: [],
      salesDetails: [],
      receipts: [],
      payments: []
    };
  }
}

// Async initializer for database persistence
async function initStore() {
  const pool = getDbPool();
  if (pool) {
    try {
      const dbData = await loadStoreFromDb();
      if (dbData) {
        store = dbData;
        console.log('[Neon DB] App initialized with persistent state from database.');
        return store;
      }

      // If DB is empty, seed from local mockData.json
      loadStoreSync();
      console.log('[Neon DB] Database is empty. Seeding initial dataset into Neon PostgreSQL...');
      await saveStoreToDb(store);
      return store;
    } catch (err) {
      console.error('[Neon DB] Initialization error, falling back to local file:', err);
    }
  }

  loadStoreSync();
  return store;
}

function saveStore() {
  // 1. Persist to Neon DB if connected
  saveStoreToDb(store).catch(err => {
    console.error('[Neon DB] Save error:', err.message);
  });

  // 2. Persist to local file if writable
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    // Read-only filesystem on Vercel is expected and safe
  }
}

// Initial synchronous load for immediate availability
loadStoreSync();

module.exports = {
  initStore,
  getStore: () => {
    if (!store) loadStoreSync();
    return store;
  },
  saveStore,
  reload: initStore,

  // Dimension helpers
  getStates: () => store.dimensions.states || [],
  getCities: () => store.dimensions.cities || [],
  getTypes: () => store.dimensions.types || [],
  getCategories: () => store.dimensions.categories || [],
  getSubcategories: () => store.dimensions.subcategories || [],
  getPMTStatuses: () => store.dimensions.pmtStatuses || [],
  getShippingStatuses: () => store.dimensions.shippingStatuses || [],
  getPMTModes: () => store.dimensions.pmtModes || [],

  addState: (s) => {
    if (s && !store.dimensions.states.includes(s)) {
      store.dimensions.states.push(s);
      saveStore();
    }
  },
  addCity: (c) => {
    if (c && !store.dimensions.cities.includes(c)) {
      store.dimensions.cities.push(c);
      saveStore();
    }
  },
  addType: (t) => {
    if (t && !store.dimensions.types.includes(t)) {
      store.dimensions.types.push(t);
      saveStore();
    }
  },
  addCategory: (c) => {
    if (c && !store.dimensions.categories.includes(c)) {
      store.dimensions.categories.push(c);
      saveStore();
    }
  },
  addSubcategory: (sc) => {
    if (sc && !store.dimensions.subcategories.includes(sc)) {
      store.dimensions.subcategories.push(sc);
      saveStore();
    }
  },
  addPMTStatus: (st) => {
    if (st && !store.dimensions.pmtStatuses.includes(st)) {
      store.dimensions.pmtStatuses.push(st);
      saveStore();
    }
  },
  addShippingStatus: (st) => {
    if (st && !store.dimensions.shippingStatuses.includes(st)) {
      store.dimensions.shippingStatuses.push(st);
      saveStore();
    }
  },

  // Range data accessor matching GAS dashGetRows / range naming
  getRangeData: (rangeName) => {
    const rn = (rangeName || '').toUpperCase();
    if (rn === 'RANGESUPPLIERS') {
      return store.suppliers.map(s => ({
        'Supplier ID': s.id,
        'Supplier Name': s.name,
        'Supplier Contact': s.contact,
        'Supplier Email': s.email,
        'State': s.state,
        'City': s.city,
        'Supplier Address': s.address,
        'Total Purchases': s.purchases || 0,
        'Total Payments': s.payments || 0,
        'Balance Payable': s.balance || 0
      }));
    }
    if (rn === 'RANGECUSTOMERS') {
      return store.customers.map(c => ({
        'Customer ID': c.id,
        'Customer Name': c.name,
        'Customer Contact': c.contact,
        'Customer Email': c.email,
        'State': c.state,
        'City': c.city,
        'Customer Address': c.address,
        'Total Sales': c.sales || 0,
        'Total Receipts': c.receipts || 0,
        'Balance Receivable': c.balance || 0
      }));
    }
    if (rn === 'RANGEINVENTORYITEMS') {
      return store.inventory.map(item => {
        let purchasedQty = 0;
        if (Array.isArray(store.purchaseDetails)) {
          store.purchaseDetails.forEach(pd => {
            const pdItemId = pd.itemId || pd['Item ID'];
            const pdItemName = pd.itemName || pd['Item Name'];
            if (pdItemId === item.id || (pdItemName && pdItemName.trim().toLowerCase() === (item.name || '').trim().toLowerCase())) {
              purchasedQty += Number(pd.qtyPurchased || pd['QTY Purchased'] || pd.quantity || pd.qty || 0);
            }
          });
        }
        let soldQty = 0;
        if (Array.isArray(store.salesDetails)) {
          store.salesDetails.forEach(sd => {
            const sdItemId = sd['Item ID'] || sd.itemId;
            const sdItemName = sd['Item Name'] || sd.itemName;
            if (sdItemId === item.id || (sdItemName && sdItemName.trim().toLowerCase() === (item.name || '').trim().toLowerCase())) {
              soldQty += Number(sd['QTY Sold'] || sd.qtySold || sd.quantity || 0);
            }
          });
        }
        let remainingQty = purchasedQty - soldQty;
        if (purchasedQty === 0 && soldQty === 0 && item.stock !== undefined) {
          remainingQty = Number(item.stock);
        }
        const reorderLevel = Number(item.reorderLevel !== undefined ? item.reorderLevel : (item.minStock || 0));
        const isReorder = remainingQty < reorderLevel;

        return {
          'Item ID': item.id,
          'Item Name': item.name,
          'Item Type': item.type,
          'Item Category': item.category,
          'Item Subcategory': item.subcategory,
          'Unit Cost': item.cost || 0,
          'Selling Price': item.price || 0,
          'Stock on Hand': remainingQty,
          'Min Stock Level': reorderLevel,
          'Reorder Level': reorderLevel,
          'QTY Purchased': purchasedQty,
          'QTY Sold': soldQty,
          'Remaining QTY': remainingQty,
          'Reorder Required': isReorder ? 'Yes' : 'No'
        };
      });
    }
    if (rn === 'RANGEPO') {
      return store.purchaseOrders.map(p => ({
        'Date': p.date,
        'PO ID': p.id,
        'Supplier ID': p.supplierId,
        'Supplier Name': p.supplierName,
        'Bill Num': p.billNum,
        'State': p.state,
        'City': p.city,
        'Total Amount': p.totalAmount,
        'Total Paid': p.totalPaid,
        'PO Balance': p.poBalance,
        'PMT Status': p.pmtStatus,
        'Shipping Status': p.shippingStatus
      }));
    }
    if (rn === 'RANGEPD') {
      return store.purchaseDetails.map(d => ({
        'Date': d.date,
        'PO ID': d.poId,
        'Detail ID': d.detailId,
        'Supplier ID': d.supplierId,
        'Supplier Name': d.supplierName,
        'State': d.state,
        'City': d.city,
        'Bill Num': d.billNum,
        'Item ID': d.itemId,
        'Item Type': d.itemType,
        'Item Category': d.itemCategory,
        'Item Subcategory': d.itemSubcategory,
        'Item Name': d.itemName,
        'QTY Purchased': d.qtyPurchased,
        'Unit Cost': d.unitCost,
        'Cost Excl Tax': d.costExclTax,
        'Tax Rate': d.taxRate,
        'Total Tax': d.totalTax,
        'Cost Incl Tax': d.costInclTax,
        'Shipping Fees': d.shippingFees,
        'Total Purchase Price': d.totalPrice
      }));
    }
    if (rn === 'RANGESO') {
      return store.salesOrders.map(s => ({
        'SO Date': s.date,
        'SO ID': s.soID,
        'Customer ID': s.custID,
        'Customer Name': s.custNm,
        'Invoice Num': s.inv,
        'State': s.state,
        'City': s.city,
        'Total Sales': s.totalSales,
        'Total Receipts': s.totalReceipts,
        'SO Balance': s.soBalance,
        'PMT Status': s.pmtStatus,
        'Delivery Status': s.deliveryStatus
      }));
    }
    if (rn === 'RANGESD') {
      return store.salesDetails.map(d => ({
        'SO Date': d['SO Date'],
        'SO ID': d['SO ID'],
        'Detail ID': d['Detail ID'],
        'Customer ID': d['Customer ID'],
        'Customer Name': d['Customer Name'],
        'State': d['State'],
        'City': d['City'],
        'Invoice Num': d['Invoice Num'],
        'Item ID': d['Item ID'],
        'Item Type': d['Item Type'],
        'Item Category': d['Item Category'],
        'Item Subcategory': d['Item Subcategory'],
        'Item Name': d['Item Name'],
        'QTY Sold': d['QTY Sold'],
        'Unit Price': d['Unit Price'],
        'Price Excl Tax': d['Price Excl Tax'],
        'Tax Rate': d['Tax Rate'],
        'Total Tax': d['Total Tax'],
        'Price Incl Tax': d['Price Incl Tax'],
        'Shipping Fees': d['Shipping Fees'],
        'Total Sales Price': d['Total Sales Price']
      }));
    }
    if (rn === 'RANGERECEIPTS') {
      return store.receipts.map(r => ({
        'Trx Date': r['Trx Date'],
        'Trx ID': r['Trx ID'],
        'Customer ID': r['Customer ID'],
        'Customer Name': r['Customer Name'],
        'State': r['State'],
        'City': r['City'],
        'SO ID': r['SO ID'],
        'Invoice Num': r['Invoice Num'],
        'PMT Mode': r['PMT Mode'],
        'Amount Received': r['Amount Received']
      }));
    }
    if (rn === 'RANGEPAYMENTS') {
      return store.payments.map(p => ({
        'Trx Date': p['Trx Date'],
        'Trx ID': p['Trx ID'],
        'Supplier ID': p['Supplier ID'],
        'Supplier Name': p['Supplier Name'],
        'State': p['State'],
        'City': p['City'],
        'PO ID': p['PO ID'],
        'Bill Num': p['Bill Num'],
        'PMT Mode': p['PMT Mode'],
        'Amount Paid': p['Amount Paid']
      }));
    }
    if (rn === 'RANGEDIMENSIONS') {
      const rows = [];
      const maxLen = Math.max(
        store.dimensions.states.length,
        store.dimensions.cities.length,
        store.dimensions.types.length,
        store.dimensions.categories.length,
        store.dimensions.subcategories.length,
        store.dimensions.pmtStatuses.length,
        store.dimensions.shippingStatuses.length,
        store.dimensions.pmtModes.length
      );
      for (let i = 0; i < maxLen; i++) {
        rows.push({
          'State': store.dimensions.states[i] || '',
          'City': store.dimensions.cities[i] || '',
          'Item Type': store.dimensions.types[i] || '',
          'Item Category': store.dimensions.categories[i] || '',
          'Item Subcategory': store.dimensions.subcategories[i] || '',
          'PMT Status': store.dimensions.pmtStatuses[i] || '',
          'Shipping Status': store.dimensions.shippingStatuses[i] || '',
          'PMT Mode': store.dimensions.pmtModes[i] || ''
        });
      }
      return rows;
    }
    return [];
  }
};
