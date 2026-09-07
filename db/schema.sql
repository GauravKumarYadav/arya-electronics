-- Neon PostgreSQL Schema for AIC Inventory Management ERP System

-- 1. Dimensions
CREATE TABLE IF NOT EXISTS dimensions (
  id SERIAL PRIMARY KEY,
  state VARCHAR(100),
  city VARCHAR(100),
  item_type VARCHAR(100),
  item_category VARCHAR(100),
  item_subcategory VARCHAR(100),
  pmt_status VARCHAR(50),
  shipping_status VARCHAR(50),
  pmt_mode VARCHAR(50)
);

-- 2. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact VARCHAR(100),
  email VARCHAR(255),
  state VARCHAR(100),
  city VARCHAR(100),
  address TEXT,
  purchases NUMERIC(15,2) DEFAULT 0,
  payments NUMERIC(15,2) DEFAULT 0,
  balance NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customers
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact VARCHAR(100),
  email VARCHAR(255),
  state VARCHAR(100),
  city VARCHAR(100),
  address TEXT,
  sales NUMERIC(15,2) DEFAULT 0,
  receipts NUMERIC(15,2) DEFAULT 0,
  balance NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  category VARCHAR(100),
  subcategory VARCHAR(100),
  cost NUMERIC(15,2) DEFAULT 0,
  price NUMERIC(15,2) DEFAULT 0,
  stock INT DEFAULT 0,
  min_stock INT DEFAULT 0,
  reorder VARCHAR(10) DEFAULT 'No',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(50) PRIMARY KEY,
  order_date DATE NOT NULL,
  supplier_id VARCHAR(50) REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name VARCHAR(255),
  bill_num VARCHAR(100),
  state VARCHAR(100),
  city VARCHAR(100),
  total_amount NUMERIC(15,2) DEFAULT 0,
  total_paid NUMERIC(15,2) DEFAULT 0,
  po_balance NUMERIC(15,2) DEFAULT 0,
  pmt_status VARCHAR(50) DEFAULT 'Pending',
  shipping_status VARCHAR(50) DEFAULT 'Processing',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Purchase Details (Line Items)
CREATE TABLE IF NOT EXISTS purchase_details (
  detail_id VARCHAR(50) PRIMARY KEY,
  po_id VARCHAR(50) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  order_date DATE,
  supplier_id VARCHAR(50),
  supplier_name VARCHAR(255),
  state VARCHAR(100),
  city VARCHAR(100),
  bill_num VARCHAR(100),
  item_id VARCHAR(50) REFERENCES inventory(id) ON DELETE SET NULL,
  item_type VARCHAR(100),
  item_category VARCHAR(100),
  item_subcategory VARCHAR(100),
  item_name VARCHAR(255),
  qty_purchased INT DEFAULT 1,
  unit_cost NUMERIC(15,2) DEFAULT 0,
  cost_excl_tax NUMERIC(15,2) DEFAULT 0,
  tax_rate NUMERIC(6,4) DEFAULT 0,
  total_tax NUMERIC(15,2) DEFAULT 0,
  cost_incl_tax NUMERIC(15,2) DEFAULT 0,
  shipping_fees NUMERIC(15,2) DEFAULT 0,
  total_price NUMERIC(15,2) DEFAULT 0
);

-- 7. Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
  so_id VARCHAR(50) PRIMARY KEY,
  order_date DATE NOT NULL,
  customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  invoice_num VARCHAR(100),
  state VARCHAR(100),
  city VARCHAR(100),
  total_sales NUMERIC(15,2) DEFAULT 0,
  total_receipts NUMERIC(15,2) DEFAULT 0,
  so_balance NUMERIC(15,2) DEFAULT 0,
  pmt_status VARCHAR(50) DEFAULT 'Pending',
  delivery_status VARCHAR(50) DEFAULT 'Processing',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Sales Details (Line Items)
CREATE TABLE IF NOT EXISTS sales_details (
  detail_id VARCHAR(50) PRIMARY KEY,
  so_id VARCHAR(50) REFERENCES sales_orders(so_id) ON DELETE CASCADE,
  order_date DATE,
  customer_id VARCHAR(50),
  customer_name VARCHAR(255),
  state VARCHAR(100),
  city VARCHAR(100),
  invoice_num VARCHAR(100),
  item_id VARCHAR(50) REFERENCES inventory(id) ON DELETE SET NULL,
  item_type VARCHAR(100),
  item_category VARCHAR(100),
  item_subcategory VARCHAR(100),
  item_name VARCHAR(255),
  qty_sold INT DEFAULT 1,
  unit_price NUMERIC(15,2) DEFAULT 0,
  price_excl_tax NUMERIC(15,2) DEFAULT 0,
  tax_rate NUMERIC(6,4) DEFAULT 0,
  total_tax NUMERIC(15,2) DEFAULT 0,
  price_incl_tax NUMERIC(15,2) DEFAULT 0,
  shipping_fees NUMERIC(15,2) DEFAULT 0,
  total_sales_price NUMERIC(15,2) DEFAULT 0
);

-- 9. Receipts
CREATE TABLE IF NOT EXISTS receipts (
  trx_id VARCHAR(50) PRIMARY KEY,
  trx_date DATE NOT NULL,
  customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  state VARCHAR(100),
  city VARCHAR(100),
  so_id VARCHAR(50) REFERENCES sales_orders(so_id) ON DELETE SET NULL,
  invoice_num VARCHAR(100),
  pmt_mode VARCHAR(50),
  amount_received NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Payments
CREATE TABLE IF NOT EXISTS payments (
  trx_id VARCHAR(50) PRIMARY KEY,
  trx_date DATE NOT NULL,
  supplier_id VARCHAR(50) REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name VARCHAR(255),
  state VARCHAR(100),
  city VARCHAR(100),
  po_id VARCHAR(50) REFERENCES purchase_orders(id) ON DELETE SET NULL,
  bill_num VARCHAR(100),
  pmt_mode VARCHAR(50),
  amount_paid NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
