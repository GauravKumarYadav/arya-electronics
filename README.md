# AIC Inventory Management ERP System

A full-stack, enterprise-grade Inventory & Business ERP application originally developed for Google Apps Script (GAS) and successfully adapted into a modern, standalone Node.js/Express web application ready for local execution and deployment on **Vercel** with **Neon PostgreSQL**.

---

## 🌟 Key Features

- **Executive Dashboard**: Real-time KPI summaries (Total Sales, Purchases, Net Profit, Receivables, Payables, Top Location & Product) with interactive ApexCharts (Sales Trend, Category Breakdown, Treemaps, Geo Distribution).
- **Inventory Management**: Complete SKU tracking, categorisation, unit costs, selling prices, real-time stock levels, and automatic reorder alerts.
- **Supplier & Customer Hub**: Master directories with contact information, addresses, and automated ledger calculations (Purchases, Payments, Sales, Receipts, and Balances).
- **Procurement & Purchase Orders**: Multi-item purchase order generation, itemized tax and shipping calculations, and stock intake.
- **Sales & Invoicing**: Order generation, itemized discounts/taxes, and instant inventory stock deductions.
- **Cash Flow Tracking**: Separate dedicated modules for Accounts Receivable (Customer Receipts) and Accounts Payable (Supplier Disbursements).
- **Dual Data Layer**:
  - **Local Mock Store**: In-memory and persistent JSON (`data/mockData.json`) for zero-dependency local development and testing.
  - **Neon PostgreSQL Production Store**: Relational schema (`db/schema.sql`) and connection pooling (`db/neonClient.js`) for serverless cloud execution.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18 or newer recommended)
- npm

### 1. Installation
In the project root:
```bash
npm install
```

### 2. Start the Application
To run with automatic file reloads during development:
```bash
npm run dev
```
Or to run normally:
```bash
npm start
```

Open your browser at:
```
http://localhost:3000/
```

---

## 🧭 Navigation & Pages

- **Dashboard**: `http://localhost:3000/?page=dashboard`
- **Inventory**: `http://localhost:3000/?page=inventory`
- **Suppliers**: `http://localhost:3000/?page=suppliers`
- **Customers**: `http://localhost:3000/?page=customers`
- **Purchases**: `http://localhost:3000/?page=purchases`
- **Sales**: `http://localhost:3000/?page=sales`
- **Receipts**: `http://localhost:3000/?page=receipts`
- **Payments**: `http://localhost:3000/?page=payments`
- **Reports**: `http://localhost:3000/?page=reports`
- **Users**: `http://localhost:3000/?page=users`
- **Settings**: `http://localhost:3000/?page=settings`

---

## ☁️ Neon PostgreSQL Setup

When you are ready to use Neon DB instead of the local JSON mock data:

1. Create a free PostgreSQL project at [Neon.tech](https://neon.tech).
2. Copy your connection string:
   ```text
   postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Set your environment variable:
   - Locally, create a `.env` file containing:
     ```env
     DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
   - On Vercel, add `DATABASE_URL` under **Project Settings > Environment Variables**.
4. The application automatically initializes all tables (`db/schema.sql`) on connection.

---

## 🚢 Deploying to Vercel

The project includes `vercel.json` and `/api/index.js` configured for Vercel Serverless Functions.

### Option A: Using Vercel CLI
```bash
npx vercel
```
Follow the CLI prompts to deploy directly to your Vercel account.

### Option B: Using GitHub & Vercel Dashboard
1. Push this repository to GitHub or GitLab.
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import the repository.
4. Set the environment variable `DATABASE_URL` (optional for Neon DB).
5. Click **Deploy**.

---

## 🏗️ Architecture Overview

- **`views/`**: Clean HTML templates for the layout and each module.
- **`public/google-script-bridge.js`**: Replaces the Google Apps Script runtime (`google.script.run`) with asynchronous HTTP POST requests to `/api/rpc`.
- **`services/rpcController.js`**: Handles backend actions, business logic, calculations, and updates.
- **`data/mockStore.js` & `data/mockData.json`**: Provides instantaneous, realistic mock datasets.
- **`db/schema.sql` & `db/neonClient.js`**: PostgreSQL migration and connection layer.
- **`server.js`**: Main Express web server.
