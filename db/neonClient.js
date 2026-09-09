const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool = null;

function getDbPool() {
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
    console.log('[Neon DB] Connected to PostgreSQL database via connection string.');
  }

  return pool;
}

/**
 * Initialize schema in Neon DB
 */
async function initSchema() {
  const p = getDbPool();
  if (!p) {
    console.log('[Neon DB] No DATABASE_URL set. Running in Local Mock Data mode.');
    return;
  }

  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await p.query(schemaSql);
    console.log('[Neon DB] Database schema successfully verified / initialized.');
  } catch (err) {
    console.error('[Neon DB] Error initializing schema:', err);
  }
}

/**
 * Load store state from Neon DB app_state table
 */
async function loadStoreFromDb() {
  const p = getDbPool();
  if (!p) return null;

  try {
    const res = await p.query("SELECT data FROM app_state WHERE key = 'main_store'");
    if (res.rows.length > 0 && res.rows[0].data) {
      console.log('[Neon DB] Successfully loaded persistent store state from app_state.');
      return res.rows[0].data;
    }
  } catch (err) {
    console.error('[Neon DB] Error loading store from database:', err.message);
  }
  return null;
}

/**
 * Synchronize individual normalized relational tables in Neon DB
 */
async function syncRelationalTables(storeData) {
  const p = getDbPool();
  if (!p || !storeData) return;

  try {
    // 1. Suppliers
    if (Array.isArray(storeData.suppliers)) {
      for (const s of storeData.suppliers) {
        if (!s.id) continue;
        await p.query(
          `INSERT INTO suppliers (id, name, contact, email, state, city, address, purchases, payments, balance)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, contact = EXCLUDED.contact, email = EXCLUDED.email,
             state = EXCLUDED.state, city = EXCLUDED.city, address = EXCLUDED.address,
             purchases = EXCLUDED.purchases, payments = EXCLUDED.payments, balance = EXCLUDED.balance`,
          [s.id, s.name || '', s.contact || '', s.email || '', s.state || '', s.city || '', s.address || '', s.purchases || 0, s.payments || 0, s.balance || 0]
        );
      }
    }

    // 2. Customers
    if (Array.isArray(storeData.customers)) {
      for (const c of storeData.customers) {
        if (!c.id) continue;
        await p.query(
          `INSERT INTO customers (id, name, contact, email, state, city, address, sales, receipts, balance)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, contact = EXCLUDED.contact, email = EXCLUDED.email,
             state = EXCLUDED.state, city = EXCLUDED.city, address = EXCLUDED.address,
             sales = EXCLUDED.sales, receipts = EXCLUDED.receipts, balance = EXCLUDED.balance`,
          [c.id, c.name || '', c.contact || '', c.email || '', c.state || '', c.city || '', c.address || '', c.sales || 0, c.receipts || 0, c.balance || 0]
        );
      }
    }

    // 3. Inventory
    if (Array.isArray(storeData.inventory)) {
      for (const i of storeData.inventory) {
        if (!i.id) continue;
        await p.query(
          `INSERT INTO inventory (id, name, type, category, subcategory, cost, price, stock, min_stock, reorder)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, type = EXCLUDED.type, category = EXCLUDED.category,
             subcategory = EXCLUDED.subcategory, cost = EXCLUDED.cost, price = EXCLUDED.price,
             stock = EXCLUDED.stock, min_stock = EXCLUDED.min_stock, reorder = EXCLUDED.reorder`,
          [i.id, i.name || '', i.type || '', i.category || '', i.subcategory || '', i.cost || 0, i.price || 0, i.stock || 0, i.reorderLevel || i.minStock || 0, i.reorder || 'No']
        );
      }
    }

    // 4. Purchase Orders
    if (Array.isArray(storeData.purchaseOrders)) {
      for (const po of storeData.purchaseOrders) {
        if (!po.id) continue;
        await p.query(
          `INSERT INTO purchase_orders (id, order_date, supplier_id, supplier_name, bill_num, state, city, total_amount, total_paid, po_balance, pmt_status, shipping_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO UPDATE SET
             order_date = EXCLUDED.order_date, supplier_id = EXCLUDED.supplier_id, supplier_name = EXCLUDED.supplier_name,
             bill_num = EXCLUDED.bill_num, state = EXCLUDED.state, city = EXCLUDED.city,
             total_amount = EXCLUDED.total_amount, total_paid = EXCLUDED.total_paid,
             po_balance = EXCLUDED.po_balance, pmt_status = EXCLUDED.pmt_status, shipping_status = EXCLUDED.shipping_status`,
          [po.id, po.date || new Date().toISOString().slice(0, 10), po.supplierId || null, po.supplierName || '', po.billNum || '', po.state || '', po.city || '', po.totalAmount || 0, po.totalPaid || 0, po.poBalance || 0, po.pmtStatus || 'Pending', po.shippingStatus || 'Processing']
        );
      }
    }

    // 5. Purchase Details
    if (Array.isArray(storeData.purchaseDetails)) {
      for (const pd of storeData.purchaseDetails) {
        if (!pd.detailId) continue;
        await p.query(
          `INSERT INTO purchase_details (detail_id, po_id, order_date, supplier_id, supplier_name, state, city, bill_num, item_id, item_type, item_category, item_subcategory, item_name, qty_purchased, unit_cost, cost_excl_tax, tax_rate, total_tax, cost_incl_tax, shipping_fees, total_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
           ON CONFLICT (detail_id) DO UPDATE SET
             po_id = EXCLUDED.po_id, order_date = EXCLUDED.order_date, supplier_id = EXCLUDED.supplier_id, supplier_name = EXCLUDED.supplier_name,
             state = EXCLUDED.state, city = EXCLUDED.city, bill_num = EXCLUDED.bill_num, item_id = EXCLUDED.item_id,
             item_type = EXCLUDED.item_type, item_category = EXCLUDED.item_category, item_subcategory = EXCLUDED.item_subcategory,
             item_name = EXCLUDED.item_name, qty_purchased = EXCLUDED.qty_purchased, unit_cost = EXCLUDED.unit_cost,
             cost_excl_tax = EXCLUDED.cost_excl_tax, tax_rate = EXCLUDED.tax_rate, total_tax = EXCLUDED.total_tax,
             cost_incl_tax = EXCLUDED.cost_incl_tax, shipping_fees = EXCLUDED.shipping_fees, total_price = EXCLUDED.total_price`,
          [pd.detailId, pd.poId || null, pd.date || new Date().toISOString().slice(0, 10), pd.supplierId || null, pd.supplierName || '', pd.state || '', pd.city || '', pd.billNum || '', pd.itemId || null, pd.itemType || '', pd.itemCategory || '', pd.itemSubcategory || '', pd.itemName || '', pd.qtyPurchased || 0, pd.unitCost || 0, pd.costExclTax || 0, pd.taxRate || 0, pd.totalTax || 0, pd.costInclTax || 0, pd.shippingFees || 0, pd.totalPrice || 0]
        );
      }
    }

    // 6. Sales Orders
    if (Array.isArray(storeData.salesOrders)) {
      for (const so of storeData.salesOrders) {
        if (!so.soID) continue;
        await p.query(
          `INSERT INTO sales_orders (so_id, order_date, customer_id, customer_name, invoice_num, state, city, total_sales, total_receipts, so_balance, pmt_status, delivery_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (so_id) DO UPDATE SET
             order_date = EXCLUDED.order_date, customer_id = EXCLUDED.customer_id, customer_name = EXCLUDED.customer_name,
             invoice_num = EXCLUDED.invoice_num, state = EXCLUDED.state, city = EXCLUDED.city,
             total_sales = EXCLUDED.total_sales, total_receipts = EXCLUDED.total_receipts,
             so_balance = EXCLUDED.so_balance, pmt_status = EXCLUDED.pmt_status, delivery_status = EXCLUDED.delivery_status`,
          [so.soID, so.date || new Date().toISOString().slice(0, 10), so.custID || null, so.custNm || '', so.inv || '', so.state || '', so.city || '', so.totalSales || 0, so.totalReceipts || 0, so.soBalance || 0, so.pmtStatus || 'Pending', so.deliveryStatus || 'Processing']
        );
      }
    }

    // 7. Sales Details
    if (Array.isArray(storeData.salesDetails)) {
      for (const sd of storeData.salesDetails) {
        const detailId = sd['Detail ID'] || sd.detailId;
        if (!detailId) continue;
        const soId = sd['SO ID'] || sd.soId;
        const orderDate = sd['SO Date'] || sd.date || new Date().toISOString().slice(0, 10);
        const custId = sd['Customer ID'] || sd.customerId;
        const custName = sd['Customer Name'] || sd.customerName;
        const state = sd['State'] || sd.state;
        const city = sd['City'] || sd.city;
        const inv = sd['Invoice Num'] || sd.invoiceNum;
        const itemId = sd['Item ID'] || sd.itemId;
        const itemType = sd['Item Type'] || sd.itemType;
        const itemCat = sd['Item Category'] || sd.itemCategory;
        const itemSub = sd['Item Subcategory'] || sd.itemSubcategory;
        const itemName = sd['Item Name'] || sd.itemName;
        const qtySold = sd['QTY Sold'] || sd.qtySold || 0;
        const unitPrice = sd['Unit Price'] || sd.unitPrice || 0;
        const priceExcl = sd['Price Excl Tax'] || sd.priceExclTax || 0;
        const taxRate = sd['Tax Rate'] || sd.taxRate || 0;
        const totalTax = sd['Total Tax'] || sd.totalTax || 0;
        const priceIncl = sd['Price Incl Tax'] || sd.priceInclTax || 0;
        const shipping = sd['Shipping Fees'] || sd.shippingFees || 0;
        const totalPrice = sd['Total Sales Price'] || sd.totalPrice || 0;

        await p.query(
          `INSERT INTO sales_details (detail_id, so_id, order_date, customer_id, customer_name, state, city, invoice_num, item_id, item_type, item_category, item_subcategory, item_name, qty_sold, unit_price, price_excl_tax, tax_rate, total_tax, price_incl_tax, shipping_fees, total_sales_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
           ON CONFLICT (detail_id) DO UPDATE SET
             so_id = EXCLUDED.so_id, order_date = EXCLUDED.order_date, customer_id = EXCLUDED.customer_id, customer_name = EXCLUDED.customer_name,
             state = EXCLUDED.state, city = EXCLUDED.city, invoice_num = EXCLUDED.invoice_num, item_id = EXCLUDED.item_id,
             item_type = EXCLUDED.item_type, item_category = EXCLUDED.item_category, item_subcategory = EXCLUDED.item_subcategory,
             item_name = EXCLUDED.item_name, qty_sold = EXCLUDED.qty_sold, unit_price = EXCLUDED.unit_price,
             price_excl_tax = EXCLUDED.price_excl_tax, tax_rate = EXCLUDED.tax_rate, total_tax = EXCLUDED.total_tax,
             price_incl_tax = EXCLUDED.price_incl_tax, shipping_fees = EXCLUDED.shipping_fees, total_sales_price = EXCLUDED.total_sales_price`,
          [detailId, soId || null, orderDate, custId || null, custName || '', state || '', city || '', inv || '', itemId || null, itemType || '', itemCat || '', itemSub || '', itemName || '', qtySold, unitPrice, priceExcl, taxRate, totalTax, priceIncl, shipping, totalPrice]
        );
      }
    }

    // 8. Receipts
    if (Array.isArray(storeData.receipts)) {
      for (const r of storeData.receipts) {
        const trxId = r['Trx ID'] || r.trxId;
        if (!trxId) continue;
        const trxDate = r['Trx Date'] || r.date || new Date().toISOString().slice(0, 10);
        const custId = r['Customer ID'] || r.customerId;
        const custName = r['Customer Name'] || r.customerName;
        const state = r['State'] || r.state;
        const city = r['City'] || r.city;
        const soId = r['SO ID'] || r.soId;
        const inv = r['Invoice Num'] || r.invoiceNum;
        const pmtMode = r['PMT Mode'] || r.pmtMode;
        const amount = r['Amount Received'] || r.amountReceived || 0;

        await p.query(
          `INSERT INTO receipts (trx_id, trx_date, customer_id, customer_name, state, city, so_id, invoice_num, pmt_mode, amount_received)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (trx_id) DO UPDATE SET
             trx_date = EXCLUDED.trx_date, customer_id = EXCLUDED.customer_id, customer_name = EXCLUDED.customer_name,
             state = EXCLUDED.state, city = EXCLUDED.city, so_id = EXCLUDED.so_id, invoice_num = EXCLUDED.invoice_num,
             pmt_mode = EXCLUDED.pmt_mode, amount_received = EXCLUDED.amount_received`,
          [trxId, trxDate, custId || null, custName || '', state || '', city || '', soId || null, inv || '', pmtMode || '', amount]
        );
      }
    }

    // 9. Payments
    if (Array.isArray(storeData.payments)) {
      for (const pt of storeData.payments) {
        const trxId = pt['Trx ID'] || pt.trxId;
        if (!trxId) continue;
        const trxDate = pt['Trx Date'] || pt.date || new Date().toISOString().slice(0, 10);
        const supId = pt['Supplier ID'] || pt.supplierId;
        const supName = pt['Supplier Name'] || pt.supplierName;
        const state = pt['State'] || pt.state;
        const city = pt['City'] || pt.city;
        const poId = pt['PO ID'] || pt.poId;
        const billNum = pt['Bill Num'] || pt.billNum;
        const pmtMode = pt['PMT Mode'] || pt.pmtMode;
        const amount = pt['Amount Paid'] || pt.amountPaid || 0;

        await p.query(
          `INSERT INTO payments (trx_id, trx_date, supplier_id, supplier_name, state, city, po_id, bill_num, pmt_mode, amount_paid)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (trx_id) DO UPDATE SET
             trx_date = EXCLUDED.trx_date, supplier_id = EXCLUDED.supplier_id, supplier_name = EXCLUDED.supplier_name,
             state = EXCLUDED.state, city = EXCLUDED.city, po_id = EXCLUDED.po_id, bill_num = EXCLUDED.bill_num,
             pmt_mode = EXCLUDED.pmt_mode, amount_paid = EXCLUDED.amount_paid`,
          [trxId, trxDate, supId || null, supName || '', state || '', city || '', poId || null, billNum || '', pmtMode || '', amount]
        );
      }
    }
  } catch (err) {
    console.error('[Neon DB] Relational sync warning:', err.message);
  }
}

/**
 * Persist store state to Neon DB
 */
async function saveStoreToDb(storeData) {
  const p = getDbPool();
  if (!p || !storeData) return;

  try {
    await p.query(
      `INSERT INTO app_state (key, data, updated_at)
       VALUES ('main_store', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = NOW()`,
      [JSON.stringify(storeData)]
    );
    // Synchronize to relational tables
    await syncRelationalTables(storeData);
  } catch (err) {
    console.error('[Neon DB] Error saving store to database:', err.message);
  }
}

module.exports = {
  getDbPool,
  initSchema,
  loadStoreFromDb,
  saveStoreToDb,
  syncRelationalTables
};
