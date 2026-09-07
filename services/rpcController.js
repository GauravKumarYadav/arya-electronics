const mockStore = require('../data/mockStore');

/**
 * Dispatches and executes RPC calls matching Google Apps Script functions
 */
async function handleRpc(action, args = []) {
  const store = mockStore.getStore();

  switch (action) {
    // ==========================================
    // DASHBOARD
    // ==========================================
    case 'dashGetRows': {
      const [rangeName] = args;
      return mockStore.getRangeData(rangeName);
    }

    case 'dashGetDashboardData': {
      const sales = mockStore.getRangeData('RANGESD');
      const purchases = mockStore.getRangeData('RANGEPD');
      const customers = mockStore.getRangeData('RANGECUSTOMERS');
      const suppliers = mockStore.getRangeData('RANGESUPPLIERS');

      const totalSales = sales.reduce((sum, r) => sum + Number(r['Total Sales Price'] || 0), 0);
      const totalPurchases = purchases.reduce((sum, r) => sum + Number(r['Total Purchase Price'] || 0), 0);
      const netProfit = totalSales - totalPurchases;
      const totalReceivable = customers.reduce((sum, r) => sum + Number(r['Balance Receivable'] || 0), 0);
      const totalPayable = suppliers.reduce((sum, r) => sum + Number(r['Balance Payable'] || 0), 0);

      // Top Location
      const salesByCityMap = {};
      sales.forEach(r => {
        const city = r['City'] || 'Unknown';
        salesByCityMap[city] = (salesByCityMap[city] || 0) + Number(r['Total Sales Price'] || 0);
      });
      const topLocation = Object.entries(salesByCityMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      // Top Item
      const salesByItemMap = {};
      sales.forEach(r => {
        const item = r['Item Type'] || r['Item Name'] || 'Unknown';
        salesByItemMap[item] = (salesByItemMap[item] || 0) + Number(r['Total Sales Price'] || 0);
      });
      const topItem = Object.entries(salesByItemMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      // Sales Trend
      const trendMap = {};
      sales.forEach(r => {
        const d = new Date(r['SO Date'] || Date.now());
        const key = !isNaN(d) ? d.toISOString().slice(0, 7) + '-01' : '2025-01-01';
        trendMap[key] = (trendMap[key] || 0) + Number(r['Total Sales Price'] || 0);
      });
      const salesTrendDates = Object.keys(trendMap).sort();
      const salesTrendValues = salesTrendDates.map(d => trendMap[d]);

      // Sales By Location (State)
      const stateMap = {};
      sales.forEach(r => {
        const st = r['State'] || 'Unknown';
        stateMap[st] = (stateMap[st] || 0) + Number(r['Total Sales Price'] || 0);
      });
      const salesByLocation = { labels: Object.keys(stateMap), values: Object.values(stateMap) };

      // Sales By Category
      const catMap = {};
      sales.forEach(r => {
        const c = r['Item Type'] || 'Unknown';
        catMap[c] = (catMap[c] || 0) + Number(r['Total Sales Price'] || 0);
      });
      const totalCat = Object.values(catMap).reduce((a, b) => a + b, 0) || 1;
      const salesByCategory = {
        labels: Object.keys(catMap),
        values: Object.values(catMap).map(v => Math.round((v / totalCat) * 100))
      };

      // Top 10 Customers
      const custMap = {};
      sales.forEach(r => {
        const c = r['Customer Name'] || 'Unknown';
        custMap[c] = (custMap[c] || 0) + Number(r['Total Sales Price'] || 0);
      });
      const topCustArr = Object.entries(custMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const topCustomers = { labels: topCustArr.map(a => a[0]), values: topCustArr.map(a => a[1]) };

      // Purchase By Location
      const purStateMap = {};
      purchases.forEach(r => {
        const st = r['State'] || 'Unknown';
        purStateMap[st] = (purStateMap[st] || 0) + Number(r['Total Purchase Price'] || 0);
      });
      const purchaseByLocation = {
        labels: Object.keys(purStateMap),
        values: Object.values(purStateMap)
      };

      // Purchase By Category
      const pCatYears = [2024, 2025];
      const pCatMap = {};
      purchases.forEach(r => {
        const c = r['Item Type'] || 'General';
        if (!pCatMap[c]) pCatMap[c] = [0, 0];
        const yr = new Date(r['Date'] || Date.now()).getFullYear();
        if (yr === 2024) pCatMap[c][0] += Number(r['Total Purchase Price'] || 0);
        else pCatMap[c][1] += Number(r['Total Purchase Price'] || 0);
      });
      const pSeries = Object.keys(pCatMap).map(cat => ({
        name: cat,
        data: pCatMap[cat]
      }));

      // Sales By City (Treemap)
      const salesByCity = Object.entries(salesByCityMap).map(([city, val]) => ({
        x: city,
        y: val
      }));

      return {
        totalSales,
        totalPurchases,
        netProfit,
        totalReceivable,
        totalPayable,
        topLocation,
        topItem,
        salesTrend: { dates: salesTrendDates, values: salesTrendValues },
        salesByLocation,
        salesByCategory,
        topCustomers,
        purchaseByLocation,
        purchaseByCategory: { years: pCatYears, series: pSeries },
        salesByCity
      };
    }

    // ==========================================
    // SUPPLIERS
    // ==========================================
    case 'supGetSuppliers': {
      return store.suppliers.map(s => ({
        id: s.id,
        name: s.name,
        contact: s.contact,
        email: s.email,
        state: s.state,
        city: s.city,
        address: s.address,
        purchases: s.purchases || 0,
        payments: s.payments || 0,
        balance: s.balance || 0
      }));
    }

    case 'supGetStates':
      return mockStore.getStates();

    case 'supGetCities':
      return mockStore.getCities();

    case 'supAddNewState': {
      const [stateName] = args;
      mockStore.addState(stateName);
      return { success: true };
    }

    case 'supAddNewCity': {
      const [cityName] = args;
      mockStore.addCity(cityName);
      return { success: true };
    }

    case 'supGenerateSupplierId': {
      const nextNum = store.suppliers.length + 1;
      return `SUP-${String(nextNum).padStart(4, '0')}`;
    }

    case 'supAddNewSupplier': {
      const [supplier] = args;
      store.suppliers.push({
        id: supplier.id || `SUP-${String(store.suppliers.length + 1).padStart(4, '0')}`,
        name: supplier.name,
        contact: supplier.contact,
        email: supplier.email,
        state: supplier.state,
        city: supplier.city,
        address: supplier.address,
        purchases: 0,
        payments: 0,
        balance: 0
      });
      mockStore.saveStore();
      return { success: true, message: 'Supplier added successfully' };
    }

    case 'supUpdateSupplier': {
      const [supplier] = args;
      const index = store.suppliers.findIndex(s => s.id === supplier.id);
      if (index !== -1) {
        store.suppliers[index] = { ...store.suppliers[index], ...supplier };
        mockStore.saveStore();
        return { success: true, message: 'Supplier updated successfully' };
      }
      throw new Error('Supplier not found');
    }

    case 'supDeleteSupplier': {
      const [supplierId] = args;
      store.suppliers = store.suppliers.filter(s => s.id !== supplierId);
      mockStore.saveStore();
      return { success: true, message: 'Supplier deleted successfully' };
    }

    // ==========================================
    // CUSTOMERS
    // ==========================================
    case 'custGetCustomers': {
      return store.customers.map(c => ({
        id: c.id,
        name: c.name,
        contact: c.contact,
        email: c.email,
        state: c.state,
        city: c.city,
        address: c.address,
        sales: c.sales || 0,
        receipts: c.receipts || 0,
        balance: c.balance || 0
      }));
    }

    case 'custGetStates':
      return mockStore.getStates();

    case 'custGetCities':
      return mockStore.getCities();

    case 'custAddNewState': {
      const [stateName] = args;
      mockStore.addState(stateName);
      return { success: true };
    }

    case 'custAddNewCity': {
      const [cityName] = args;
      mockStore.addCity(cityName);
      return { success: true };
    }

    case 'custGenerateCustomerId': {
      const nextNum = store.customers.length + 1;
      return `CUST-${String(nextNum).padStart(4, '0')}`;
    }

    case 'custAddNewCustomer': {
      const [customer] = args;
      store.customers.push({
        id: customer.id || `CUST-${String(store.customers.length + 1).padStart(4, '0')}`,
        name: customer.name,
        contact: customer.contact,
        email: customer.email,
        state: customer.state,
        city: customer.city,
        address: customer.address,
        sales: 0,
        receipts: 0,
        balance: 0
      });
      mockStore.saveStore();
      return { success: true, message: 'Customer added successfully' };
    }

    case 'custUpdateCustomer': {
      const [customer] = args;
      const index = store.customers.findIndex(c => c.id === customer.id);
      if (index !== -1) {
        store.customers[index] = { ...store.customers[index], ...customer };
        mockStore.saveStore();
        return { success: true, message: 'Customer updated successfully' };
      }
      throw new Error('Customer not found');
    }

    case 'custDeleteCustomer': {
      const [customerId] = args;
      store.customers = store.customers.filter(c => c.id !== customerId);
      mockStore.saveStore();
      return { success: true, message: 'Customer deleted successfully' };
    }

    // ==========================================
    // INVENTORY
    // ==========================================
    case 'itemGetInventoryItems': {
      return store.inventory.map(item => {
        // Calculate purchased quantity from purchaseDetails
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
        if (purchasedQty === 0 && item.purchasedQty !== undefined) {
          purchasedQty = Number(item.purchasedQty);
        }

        // Calculate sold quantity from salesDetails
        let soldQty = 0;
        if (Array.isArray(store.salesDetails)) {
          store.salesDetails.forEach(sd => {
            const sdItemId = sd['Item ID'] || sd.itemId;
            const sdItemName = sd['Item Name'] || sd.itemName;
            if (sdItemId === item.id || (sdItemName && sdItemName.trim().toLowerCase() === (item.name || '').trim().toLowerCase())) {
              soldQty += Number(sd['QTY Sold'] || sd.qtySold || sd.quantity || sd.qty || 0);
            }
          });
        }
        if (soldQty === 0 && item.soldQty !== undefined) {
          soldQty = Number(item.soldQty);
        }

        // Remaining quantity
        let remainingQty = purchasedQty - soldQty;
        if (purchasedQty === 0 && soldQty === 0 && item.stock !== undefined) {
          remainingQty = Number(item.stock);
        }

        const reorderLevel = Number(item.reorderLevel !== undefined ? item.reorderLevel : (item.minStock || 0));
        const reorderRequired = remainingQty < reorderLevel;

        return {
          id: item.id,
          name: item.name,
          type: item.type,
          category: item.category,
          subcategory: item.subcategory,
          cost: Number(item.cost) || 0,
          price: Number(item.price) || 0,
          stock: remainingQty,
          purchasedQty: purchasedQty,
          soldQty: soldQty,
          remainingQty: remainingQty,
          reorderLevel: reorderLevel,
          reorderRequired: reorderRequired,
          reorder: reorderRequired ? 'Yes' : 'No',
          // Sheet header compatibility fallbacks
          'Item ID': item.id,
          'Item Name': item.name,
          'Item Type': item.type,
          'Item Category': item.category,
          'Item Subcategory': item.subcategory,
          'QTY Purchased': purchasedQty,
          'QTY Sold': soldQty,
          'Remaining QTY': remainingQty,
          'Reorder Level': reorderLevel,
          'Reorder Required': reorderRequired ? 'Yes' : 'No'
        };
      });
    }

    case 'itemGetTypes':
      return mockStore.getTypes();

    case 'itemGetCategories':
      return mockStore.getCategories();

    case 'itemGetSubcategories':
      return mockStore.getSubcategories();

    case 'itemAddNewType': {
      const [typeName] = args;
      mockStore.addType(typeName);
      return { success: true };
    }

    case 'itemAddNewCategory': {
      const [categoryName] = args;
      mockStore.addCategory(categoryName);
      return { success: true };
    }

    case 'itemAddNewSubcategory': {
      const [subName] = args;
      mockStore.addSubcategory(subName);
      return { success: true };
    }

    case 'itemGenerateInventoryId': {
      let maxNum = 0;
      store.inventory.forEach(item => {
        const match = (item.id || '').match(/(\d+)/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > maxNum) maxNum = n;
        }
      });
      return `ITEM-${String(maxNum + 1).padStart(4, '0')}`;
    }

    case 'itemAddNewInventoryItem': {
      const [item] = args;
      let itemId = item.id;
      if (!itemId || store.inventory.some(i => i.id === itemId)) {
        let maxNum = 0;
        store.inventory.forEach(i => {
          const m = (i.id || '').match(/(\d+)/);
          if (m) {
            const n = parseInt(m[1], 10);
            if (n > maxNum) maxNum = n;
          }
        });
        itemId = `ITEM-${String(maxNum + 1).padStart(4, '0')}`;
      }

      const reorderLevel = Number(item.reorderLevel !== undefined ? item.reorderLevel : (item.minStock || 0));

      store.inventory.push({
        id: itemId,
        name: item.name,
        type: item.type,
        category: item.category,
        subcategory: item.subcategory,
        cost: Number(item.cost) || 0,
        price: Number(item.price) || 0,
        stock: Number(item.stock) || 0,
        minStock: reorderLevel,
        reorderLevel: reorderLevel,
        reorder: 'No'
      });
      mockStore.saveStore();
      return { success: true, message: 'Item added successfully', id: itemId };
    }

    case 'itemUpdateInventoryItem': {
      const [item] = args;
      const index = store.inventory.findIndex(i => i.id === item.id);
      if (index !== -1) {
        const existing = store.inventory[index];
        const reorderLevel = Number(item.reorderLevel !== undefined ? item.reorderLevel : (existing.reorderLevel || existing.minStock || 0));
        store.inventory[index] = {
          ...existing,
          ...item,
          reorderLevel: reorderLevel,
          minStock: reorderLevel,
          cost: Number(item.cost !== undefined ? item.cost : existing.cost),
          price: Number(item.price !== undefined ? item.price : existing.price),
          stock: Number(item.stock !== undefined ? item.stock : existing.stock)
        };
        mockStore.saveStore();
        return { success: true, message: 'Item updated successfully' };
      }
      throw new Error('Item not found');
    }

    case 'itemDeleteInventoryItem': {
      const [itemId] = args;
      store.inventory = store.inventory.filter(i => i.id !== itemId);
      mockStore.saveStore();
      return 'success';
    }

    // ==========================================
    // PURCHASES
    // ==========================================
    case 'poGetSuppliers': {
      return store.suppliers.map(s => ({
        id: s.id,
        name: s.name,
        state: s.state,
        city: s.city
      }));
    }

    case 'poGetInventoryItems': {
      return store.inventory.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        category: i.category,
        subcategory: i.subcategory,
        cost: i.cost,
        price: i.price,
        stock: i.stock
      }));
    }

    case 'poGetPMTStatuses':
      return mockStore.getPMTStatuses();

    case 'poGetShippingStatuses':
      return mockStore.getShippingStatuses();

    case 'poAddNewPMTStatus': {
      const [status] = args;
      mockStore.addPMTStatus(status);
      return { success: true };
    }

    case 'poAddNewShippingStatus': {
      const [status] = args;
      mockStore.addShippingStatus(status);
      return { success: true };
    }

    case 'poGeneratePOID': {
      let id;
      const existing = store.purchaseOrders.map(p => p.id);
      do {
        id = 'PO' + Math.floor(1000 + Math.random() * 9000);
      } while (existing.includes(id));
      return id;
    }

    case 'poGetPOs': {
      return store.purchaseOrders.map(p => ({
        date: p.date,
        id: p.id,
        supplierId: p.supplierId,
        supplierName: p.supplierName,
        billNum: p.billNum,
        state: p.state,
        city: p.city,
        totalAmount: p.totalAmount,
        totalPaid: p.totalPaid,
        poBalance: p.poBalance,
        pmtStatus: p.pmtStatus,
        shippingStatus: p.shippingStatus
      }));
    }

    case 'poGetPODetails': {
      const [poId] = args;
      const details = store.purchaseDetails.filter(d => d.poId === poId);
      return details.map(d => ({
        date: d.date,
        poId: d.poId,
        detailId: d.detailId,
        supplierId: d.supplierId,
        supplierName: d.supplierName,
        billNum: d.billNum,
        itemId: d.itemId,
        itemType: d.itemType,
        itemCategory: d.itemCategory,
        itemSubcategory: d.itemSubcategory,
        itemName: d.itemName,
        qtyPurchased: d.qtyPurchased,
        unitCost: d.unitCost,
        costExclTax: d.costExclTax,
        taxRate: d.taxRate,
        totalTax: d.totalTax,
        costInclTax: d.costInclTax,
        shippingFees: d.shippingFees,
        totalPrice: d.totalPrice
      }));
    }

    case 'poSaveNewPO': {
      const [items] = args;
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('No items provided to save.');
      }

      let totalAmount = 0;
      const poId = items[0].poId;

      items.forEach(item => {
        const detail = {
          date: item.date,
          poId: item.poId,
          detailId: item.detailId || ('PD' + Math.floor(1000 + Math.random() * 9000)),
          supplierId: item.supplierId,
          supplierName: item.supplierName,
          state: item.state,
          city: item.city,
          billNum: item.billNum,
          itemId: item.itemId,
          itemType: item.itemType,
          itemCategory: item.itemCategory,
          itemSubcategory: item.itemSubcategory,
          itemName: item.itemName,
          qtyPurchased: Number(item.qtyPurchased) || 0,
          unitCost: Number(item.unitCost) || 0,
          costExclTax: Number(item.costExclTax) || 0,
          taxRate: Number(item.taxRate) || 0,
          totalTax: Number(item.totalTax) || 0,
          costInclTax: Number(item.costInclTax) || 0,
          shippingFees: Number(item.shippingFees) || 0,
          totalPrice: Number(item.totalPrice) || 0
        };
        store.purchaseDetails.push(detail);
        totalAmount += detail.totalPrice;

        // Update inventory stock
        const invItem = store.inventory.find(inv => inv.id === item.itemId);
        if (invItem) {
          invItem.stock = (invItem.stock || 0) + detail.qtyPurchased;
          invItem.reorder = (invItem.stock <= invItem.minStock) ? 'Yes' : 'No';
        }
      });

      // Master order row
      const first = items[0];
      const poMaster = {
        id: poId,
        date: first.date,
        supplierId: first.supplierId,
        supplierName: first.supplierName,
        billNum: first.billNum,
        state: first.state,
        city: first.city,
        totalAmount: totalAmount,
        totalPaid: 0,
        poBalance: totalAmount,
        pmtStatus: 'Pending',
        shippingStatus: 'Processing'
      };
      store.purchaseOrders.push(poMaster);

      // Update supplier purchases & balance
      const sup = store.suppliers.find(s => s.id === first.supplierId);
      if (sup) {
        sup.purchases = (sup.purchases || 0) + totalAmount;
        sup.balance = (sup.balance || 0) + totalAmount;
      }

      mockStore.saveStore();
      return { success: true, poId };
    }

    case 'poDeletePODetail': {
      const [detailId, poId] = args;
      const detailIndex = store.purchaseDetails.findIndex(d => d.detailId === detailId);
      if (detailIndex !== -1) {
        const [removed] = store.purchaseDetails.splice(detailIndex, 1);
        // Recalculate PO total
        const po = store.purchaseOrders.find(p => p.id === poId);
        if (po) {
          po.totalAmount = Math.max(0, (po.totalAmount || 0) - (removed.totalPrice || 0));
          po.poBalance = Math.max(0, po.totalAmount - (po.totalPaid || 0));
        }
        mockStore.saveStore();
      }
      return { success: true };
    }

    case 'poSavePODetails': {
      const [updates] = args;
      if (Array.isArray(updates)) {
        updates.forEach(u => {
          const detail = store.purchaseDetails.find(d => d.detailId === u.detailId);
          if (detail) Object.assign(detail, u);
        });
        mockStore.saveStore();
      }
      return { success: true };
    }

    // ==========================================
    // SALES
    // ==========================================
    case 'soGetAllSO': {
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

    case 'soGetCustomers': {
      return mockStore.getRangeData('RANGECUSTOMERS');
    }

    case 'soGetInventoryItems': {
      return mockStore.getRangeData('RANGEINVENTORYITEMS');
    }

    case 'soGetSODetails': {
      const [soID] = args;
      return store.salesDetails.filter(d => d['SO ID'] === soID);
    }

    case 'soGenerateSOID': {
      const existing = store.salesOrders.map(r => r.soID);
      let id;
      do {
        id = 'SO' + Math.floor(1000 + Math.random() * 9000);
      } while (existing.includes(id));
      return id;
    }

    case 'soGenerateSalesDetailID': {
      const existing = store.salesDetails.map(r => r['Detail ID']);
      let id;
      do {
        id = 'D' + Math.floor(1000 + Math.random() * 9000);
      } while (existing.includes(id));
      return id;
    }

    case 'soSaveNewSO': {
      const [payload] = args;
      if (!payload || !payload.master || !payload.details) {
        throw new Error('Invalid sales payload');
      }

      const master = payload.master;
      let totalSalesAmount = 0;

      payload.details.forEach(d => {
        const totalPrice = Number(d['Total Sales Price']) || 0;
        totalSalesAmount += totalPrice;
        store.salesDetails.push({
          'SO Date': d['SO Date'],
          'SO ID': d['SO ID'],
          'Detail ID': d['Detail ID'] || ('D' + Math.floor(1000 + Math.random() * 9000)),
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
          'QTY Sold': Number(d['QTY Sold']) || 0,
          'Unit Price': Number(d['Unit Price']) || 0,
          'Price Excl Tax': Number(d['Price Excl Tax']) || 0,
          'Tax Rate': Number(d['Tax Rate']) || 0,
          'Total Tax': Number(d['Total Tax']) || 0,
          'Price Incl Tax': Number(d['Price Incl Tax']) || 0,
          'Shipping Fees': Number(d['Shipping Fees']) || 0,
          'Total Sales Price': totalPrice
        });

        // Deduct inventory stock
        const invItem = store.inventory.find(i => i.id === d['Item ID']);
        if (invItem) {
          invItem.stock = Math.max(0, (invItem.stock || 0) - (Number(d['QTY Sold']) || 0));
          invItem.reorder = (invItem.stock <= invItem.minStock) ? 'Yes' : 'No';
        }
      });

      store.salesOrders.push({
        soID: master.soID,
        date: master.date,
        custID: master.custID,
        custNm: master.custNm,
        inv: master.inv,
        state: master.state,
        city: master.city,
        totalSales: totalSalesAmount,
        totalReceipts: 0,
        soBalance: totalSalesAmount,
        pmtStatus: 'Pending',
        deliveryStatus: 'Processing'
      });

      // Update customer sales & balance
      const cust = store.customers.find(c => c.id === master.custID);
      if (cust) {
        cust.sales = (cust.sales || 0) + totalSalesAmount;
        cust.balance = (cust.balance || 0) + totalSalesAmount;
      }

      mockStore.saveStore();
      return { success: true, soID: master.soID };
    }

    case 'soUpdateSODetails': {
      const [rows] = args;
      if (Array.isArray(rows)) {
        rows.forEach(r => {
          const detail = store.salesDetails.find(d => d['Detail ID'] === r['Detail ID']);
          if (detail) Object.assign(detail, r);
        });
        mockStore.saveStore();
      }
      return { success: true };
    }

    // ==========================================
    // RECEIPTS
    // ==========================================
    case 'rcGetCustomers':
      return mockStore.getRangeData('RANGECUSTOMERS');

    case 'rcGetSalesOrders':
      return mockStore.getRangeData('RANGESO');

    case 'rcGetDimensions':
      return mockStore.getRangeData('RANGEDIMENSIONS');

    case 'rcGetAllReceipts':
      return mockStore.getRangeData('RANGERECEIPTS');

    case 'rcGenerateTrxID': {
      const existing = store.receipts.map(r => r['Trx ID']);
      let id;
      do {
        id = 'RT' + Math.floor(1000 + Math.random() * 9000);
      } while (existing.includes(id));
      return id;
    }

    case 'rcSaveNewReceipt': {
      const [rec] = args;
      const amount = Number(rec['Amount Received']) || 0;
      store.receipts.push({
        'Trx Date': rec['Trx Date'],
        'Trx ID': rec['Trx ID'],
        'Customer ID': rec['Customer ID'],
        'Customer Name': rec['Customer Name'],
        'State': rec['State'],
        'City': rec['City'],
        'SO ID': rec['SO ID'],
        'Invoice Num': rec['Invoice Num'],
        'PMT Mode': rec['PMT Mode'],
        'Amount Received': amount
      });

      // Update SO balance & receipts
      const so = store.salesOrders.find(s => s.soID === rec['SO ID']);
      if (so) {
        so.totalReceipts = (so.totalReceipts || 0) + amount;
        so.soBalance = Math.max(0, (so.totalSales || 0) - so.totalReceipts);
        so.pmtStatus = so.soBalance === 0 ? 'Paid' : 'Partially Paid';
      }

      // Update Customer receipts & balance
      const cust = store.customers.find(c => c.id === rec['Customer ID']);
      if (cust) {
        cust.receipts = (cust.receipts || 0) + amount;
        cust.balance = Math.max(0, (cust.sales || 0) - cust.receipts);
      }

      mockStore.saveStore();
      return { success: true };
    }

    case 'rcUpdateReceipt': {
      const [rec] = args;
      const index = store.receipts.findIndex(r => r['Trx ID'] === rec['Trx ID']);
      if (index !== -1) {
        store.receipts[index] = { ...store.receipts[index], ...rec };
        mockStore.saveStore();
        return { success: true };
      }
      throw new Error('Receipt not found');
    }

    case 'rcDeleteReceipt': {
      const [trxID] = args;
      store.receipts = store.receipts.filter(r => r['Trx ID'] !== trxID);
      mockStore.saveStore();
      return { success: true };
    }

    // ==========================================
    // PAYMENTS
    // ==========================================
    case 'ptGetSuppliers':
      return mockStore.getRangeData('RANGESUPPLIERS');

    case 'ptGetPO':
      return mockStore.getRangeData('RANGEPO');

    case 'ptGetDimensions':
      return mockStore.getRangeData('RANGEDIMENSIONS');

    case 'ptGetAllPayments':
      return mockStore.getRangeData('RANGEPAYMENTS');

    case 'ptGenerateTrxID': {
      const existing = store.payments.map(p => p['Trx ID']);
      let id;
      do {
        id = 'PT' + Math.floor(1000 + Math.random() * 9000);
      } while (existing.includes(id));
      return id;
    }

    case 'ptSaveNewPayment': {
      const [rec] = args;
      const amount = Number(rec['Amount Paid']) || 0;
      store.payments.push({
        'Trx Date': rec['Trx Date'],
        'Trx ID': rec['Trx ID'],
        'Supplier ID': rec['Supplier ID'],
        'Supplier Name': rec['Supplier Name'],
        'State': rec['State'],
        'City': rec['City'],
        'PO ID': rec['PO ID'],
        'Bill Num': rec['Bill Num'],
        'PMT Mode': rec['PMT Mode'],
        'Amount Paid': amount
      });

      // Update PO balance & paid
      const po = store.purchaseOrders.find(p => p.id === rec['PO ID']);
      if (po) {
        po.totalPaid = (po.totalPaid || 0) + amount;
        po.poBalance = Math.max(0, (po.totalAmount || 0) - po.totalPaid);
        po.pmtStatus = po.poBalance === 0 ? 'Paid' : 'Partially Paid';
      }

      // Update Supplier payments & balance
      const sup = store.suppliers.find(s => s.id === rec['Supplier ID']);
      if (sup) {
        sup.payments = (sup.payments || 0) + amount;
        sup.balance = Math.max(0, (sup.purchases || 0) - sup.payments);
      }

      mockStore.saveStore();
      return { success: true };
    }

    case 'ptUpdatePayment': {
      const [rec] = args;
      const index = store.payments.findIndex(p => p['Trx ID'] === rec['Trx ID']);
      if (index !== -1) {
        store.payments[index] = { ...store.payments[index], ...rec };
        mockStore.saveStore();
        return { success: true };
      }
      throw new Error('Payment not found');
    }

    case 'ptDeletePayment': {
      const [trxID] = args;
      store.payments = store.payments.filter(p => p['Trx ID'] !== trxID);
      mockStore.saveStore();
      return { success: true };
    }

    default:
      console.warn(`[RPC Controller] Unknown action called: ${action}`);
      return { success: false, error: `Unknown action: ${action}` };
  }
}

module.exports = {
  handleRpc
};
