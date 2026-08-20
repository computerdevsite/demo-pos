// CONFIGURATION
const BRANCH_CONFIG = {
    'MEGAMALL': {
        url: "https://script.google.com/macros/s/AKfycbwwkcQnmXYG_E3Z9rJGyZ9dlluJ9nPFs9GeWZt211ZyEbN0wxHf9MFjXRE6NLh0fh0t/exec",
        label: "Megamall Branch",
        sheetUrl: "https://docs.google.com/spreadsheets/d/1XF6e2Q_vD_R2_61U0-oA9S30Uu4e565P6I3-T-q-T-k/edit"
    },
    'NORTH_EDSA': {
        url: "https://script.google.com/macros/s/AKfycbxKnZHePSbSMqf1G_lcnF867kEL6Idq6yNEBWiu2XtklhljQlCnloSshXHXNoHY6wUi/exec",
        label: "North Edsa Branch",
        sheetUrl: "https://docs.google.com/spreadsheets/d/1N_f_H8h6-6vXk6v-q0O-Oq0Oq0Oq0Oq0Oq0Oq0Oq0/edit"
    }
};

const PENDING_API_URL = "https://script.google.com/macros/s/AKfycbzY8_i2U7WRe7Z6Dm4dVv0-L26QbnSW4gQETNPATCthogPIpAomKiSXVaRZbgsH7opx/exec";

let allInventoryData = []; 
let allTransactionData = []; 
let top20ProcessedItems = []; 
let globalRawTransactions = [];
let salesChart;
let itemsSoldChart;
let topProductsChart;

// Kukunin ang mga dating permanenteng sinave na manual costs mula sa localStorage base sa kasalukuyang branch
function getManualCostDatabase() {
    const branch = document.getElementById('branch-selector').value;
    const key = `manual_costs_${branch}`;
    const savedData = localStorage.getItem(key);
    return savedData ? JSON.parse(savedData) : {};
}

// Isasave ang manual cost nang permanente sa localStorage ng browser
function saveManualCostToDatabase(itemName, costValue) {
    const branch = document.getElementById('branch-selector').value;
    const key = `manual_costs_${branch}`;
    const currentDb = getManualCostDatabase();
    
    currentDb[itemName] = costValue;
    localStorage.setItem(key, JSON.stringify(currentDb));
}

function getFormatDate(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return null;
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function parseAmount(val) {
    if (!val) return 0;
    const cleaned = String(val).replace(/[₱,]/g, '').trim();
    return parseFloat(cleaned) || 0;
}

function toggleProductDateInput() {
    const type = document.getElementById('product-date-type').value;
    const dayInput = document.getElementById('product-date-day');
    const monthInput = document.getElementById('product-date-month');

    if (type === 'all') {
        dayInput.style.display = 'none';
        monthInput.style.display = 'none';
    } else if (type === 'daily') {
        dayInput.style.display = 'inline-block';
        monthInput.style.display = 'none';
    } else if (type === 'monthly') {
        dayInput.style.display = 'none';
        monthInput.style.display = 'inline-block';
    }
    fetchAndRenderTopProducts();
}

function toggleTableDateInput() {
    const type = document.getElementById('table-date-type').value;
    const dayInput = document.getElementById('table-date-day');
    const monthInput = document.getElementById('table-date-month');

    if (type === 'all') {
        dayInput.style.display = 'none';
        monthInput.style.display = 'none';
    } else if (type === 'daily') {
        dayInput.style.display = 'inline-block';
        monthInput.style.display = 'none';
    } else if (type === 'monthly') {
        dayInput.style.display = 'none';
        monthInput.style.display = 'inline-block';
    }
    fetchAndRenderTopProducts();
}

function changeBranch() {
    const selectedBranch = document.getElementById('branch-selector').value;
    document.getElementById('inventory-table-body').innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 50px; color: #888;">Loading ${selectedBranch} data...</td></tr>`;
    fetchInventory(); 
}

function openSheet() {
    const branch = document.getElementById('branch-selector').value;
    window.open(BRANCH_CONFIG[branch].sheetUrl, '_blank');
}

async function fetchInventory() {
    const branch = document.getElementById('branch-selector').value;
    const syncStatus = document.getElementById('sync-status');
    const apiURL = BRANCH_CONFIG[branch].url;

    syncStatus.innerText = "Syncing " + branch + "...";

    try {
        const response = await fetch(apiURL);
        const data = await response.json();
        
        allInventoryData = data.inventory || data;
        allTransactionData = (data.transactions || []).reverse(); 
        
        updateStats(allInventoryData, allTransactionData);
        updateChart(allTransactionData);
        
        syncStatus.innerText = "● " + branch + " Live";
        syncStatus.style.color = "#2ecc71";
        checkPendingCount();
    } catch (error) {
        syncStatus.innerText = "Connection Error";
        syncStatus.style.color = "#e74c3c";
    }
}

function setDefaultDates() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    document.getElementById('date-selector').value = `${year}-${month}-${day}`;
    document.getElementById('month-selector').value = `${year}-${month}`;
    
    document.getElementById('product-date-day').value = `${year}-${month}-${day}`;
    document.getElementById('product-date-month').value = `${year}-${month}`;

    document.getElementById('table-date-day').value = `${year}-${month}-${day}`;
    document.getElementById('table-date-month').value = `${year}-${month}`;

    document.getElementById('daily-report-date').value = `${year}-${month}-${day}`;
}

async function checkPendingCount() {
    try {
        const response = await fetch(`${PENDING_API_URL}?action=getAdminData`);
        const data = await response.json();
        const pendingItems = data.approvals ? data.approvals.filter(item => item.status === "PENDING") : [];
        const count = pendingItems.length;
        const mainBadge = document.getElementById('main-pending-badge');
        if (count > 0) {
            mainBadge.innerText = count;
            mainBadge.style.display = "inline-block";
        } else {
            mainBadge.style.display = "none";
        }
    } catch (e) { console.log("Pending check failed"); }
}

function renderTable(items) {
    const tableBody = document.getElementById('inventory-table-body');
    let html = "";
    if (!items || items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No matching item data found.</td></tr>`;
        return;
    }
    items.forEach((item, index) => {
        html += `<tr>
            <td style="font-weight:bold; color: #2c3e50;">${item.name} <span style="font-size:0.75rem; color:#7f8c8d; font-weight:normal;">(Qty: ${item.qty})</span></td>
            <td>₱${item.unitPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td>
                ₱<input type="number" 
                        class="editable-cost-input" 
                        value="${item.unitCost}" 
                        step="0.01" 
                        min="0" 
                        oninput="handleCostLiveUpdate(this, ${index})">
            </td>
            <td>₱${item.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td id="total-cost-field-${index}">₱${item.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td id="total-profit-field-${index}" style="font-weight:bold; color: ${item.totalProfit >= 0 ? '#2ecc71' : '#e74c3c'};">
                ₱${item.totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </td>
        </tr>`;
    });
    tableBody.innerHTML = html;
}

// LIVE RE-COMPUTATION AND LOCAL STORAGE WRITE PER TRANSACTION/ROW
function handleCostLiveUpdate(inputElement, itemIndex) {
    const newCost = parseFloat(inputElement.value) || 0;
    const item = top20ProcessedItems[itemIndex];

    if (!item) return;

    item.unitCost = newCost;
    
    // Isasave sa browser database para hindi mawala kapag ni-refresh ang tab/bintana
    saveManualCostToDatabase(item.name, newCost);

    // Muling kuwentahin ang math para sa row na ito
    item.totalCost = item.qty * newCost;
    item.totalProfit = item.totalAmount - item.totalCost;

    // I-update ang text elements nang direkta sa DOM para walang flashing ng UI
    const totalCostCell = document.getElementById(`total-cost-field-${itemIndex}`);
    const totalProfitCell = document.getElementById(`total-profit-field-${itemIndex}`);

    if (totalCostCell) {
        totalCostCell.innerText = `₱${item.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    }
    if (totalProfitCell) {
        totalProfitCell.innerText = `₱${item.totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        totalProfitCell.style.color = item.totalProfit >= 0 ? '#2ecc71' : '#e74c3c';
    }
}

function updateStats(invItems, transItems) {
    document.getElementById('stat-total-items').innerText = invItems.length;
    const selectedDateRaw = document.getElementById('date-selector').value;
    const selectedMonthRaw = document.getElementById('month-selector').value;
    
    let salesSelectedDay = 0;
    let salesSelectedMonth = 0;
    let currentValidDate = null;

    transItems.forEach(t => {
        if (t.date) {
            const d = new Date(t.date);
            const formatted = getFormatDate(d);
            if (formatted) currentValidDate = formatted;
        }
        const tDateStr = currentValidDate;
        if (!tDateStr) return;

        const tMonthStr = tDateStr.substring(0, 7);
        const amount = parseAmount(t.total);

        if (tDateStr === selectedDateRaw) salesSelectedDay += amount;
        if (tMonthStr === selectedMonthRaw) salesSelectedMonth += amount;
    });

    document.getElementById('stat-sales-today').innerText = `₱${salesSelectedDay.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('stat-sales-month').innerText = `₱${salesSelectedMonth.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
}

function updateChart(transItems) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    const ctxItems = document.getElementById('itemsSoldChart').getContext('2d');
    const last7DaysLabels = [];
    const last7DaysKeys = [];
    const salesData = [];
    const itemsSoldData = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7DaysLabels.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        last7DaysKeys.push(getFormatDate(d));
    }

    last7DaysKeys.forEach(key => {
        let dailyTotal = 0;
        let dailyQtyCount = 0;
        let currentValidDate = null;

        transItems.forEach(t => {
            if (t.date) {
                const d = new Date(t.date);
                const formatted = getFormatDate(d);
                if (formatted) currentValidDate = formatted;
            }
            if (currentValidDate === key) {
                dailyTotal += parseAmount(t.total);
                dailyQtyCount += 1;
            }
        });
        salesData.push(dailyTotal);
        itemsSoldData.push(dailyQtyCount);
    });

    if (salesChart) salesChart.destroy();
    salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last7DaysLabels,
            datasets: [{
                label: 'Daily Sales (₱)',
                data: salesData,
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: { 
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    if (itemsSoldChart) itemsSoldChart.destroy();
    itemsSoldChart = new Chart(ctxItems, {
        type: 'line',
        data: {
            labels: last7DaysLabels,
            datasets: [{
                label: 'Items Sold (Qty)',
                data: itemsSoldData,
                backgroundColor: 'rgba(46, 204, 113, 0.2)',
                borderColor: 'rgba(46, 204, 113, 1)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: { 
            responsive: true,
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });

    fetchAndRenderTopProducts();
}

// SMART FUZZY-KEYWORD MATCHING MECHANICS
function cleanItemNameForMatching(name) {
    if (!name) return "";
    let cleaned = String(name).toLowerCase();
    
    cleaned = cleaned.replace(/premium/g, '');
    cleaned = cleaned.replace(/dye/g, '');
    cleaned = cleaned.replace(/ink/g, '');
    cleaned = cleaned.replace(/^slb|^slc|^sle/, 'sl');
    cleaned = cleaned.replace(/[^a-z0-9]/g, '');
    
    return cleaned;
}

function renderDailyReport() {
    const selectedDate = document.getElementById('daily-report-date').value;
    const tbody = document.getElementById('daily-sales-report-body');
    const tfoot = document.getElementById('daily-sales-report-foot');
    
    if (!selectedDate || globalRawTransactions.length <= 1) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #888;">Walang data para sa napiling petsa.</td></tr>`;
        tfoot.innerHTML = "";
        return;
    }

    const itemSummary = {};
    let grandTotalQty = 0;
    let grandTotalSales = 0;
    let currentValidDate = null;

    for (let i = 1; i < globalRawTransactions.length; i++) {
        const row = globalRawTransactions[i];
        
        // Carry forward date kung blangko ang kasalukuyang row
        if (row[0]) {
            const rowDateObj = new Date(row[0]);
            const formatted = getFormatDate(rowDateObj);
            if (formatted) currentValidDate = formatted;
        }
        
        const rowDateStr = currentValidDate;
        if (!rowDateStr) continue;
        
        if (rowDateStr === selectedDate) {
            const itemName = row[19] ? String(row[19]).trim() : "";
            if (!itemName) continue;
            
            const lowerName = itemName.toLowerCase();
            if (lowerName.includes("discount") || lowerName.includes("additional") || lowerName === "---") {
                continue;
            }

            const productSalesAmount = parseAmount(row[20]);
            const serviceFeeAmount = parseAmount(row[21]);
            const itemRevenue = productSalesAmount > 0 ? productSalesAmount : serviceFeeAmount;

            if (!itemSummary[itemName]) {
                itemSummary[itemName] = { qty: 0, totalSales: 0 };
            }
            itemSummary[itemName].qty += 1;
            itemSummary[itemName].totalSales += itemRevenue;

            grandTotalQty += 1;
            grandTotalSales += itemRevenue;
        }
    }

    const sortedItems = Object.entries(itemSummary).sort((a, b) => b[1].qty - a[1].qty);

    if (sortedItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #888;">Walang benta na naitala noong ${selectedDate}.</td></tr>`;
        tfoot.innerHTML = "";
        return;
    }

    let html = "";
    sortedItems.forEach(([name, data]) => {
        html += `<tr style="border-bottom: 1px solid #f1f2f6;">
            <td style="font-weight: bold; color: #2c3e50; padding: 12px;">${name}</td>
            <td style="padding: 12px;">${data.qty} pcs</td>
            <td style="padding: 12px; font-weight: bold; color: #27ae60;">₱${data.totalSales.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>`;
    });
    tbody.innerHTML = html;

    tfoot.innerHTML = `<tr>
        <td style="padding: 12px; color: #2c3e50;">GRAND TOTAL</td>
        <td style="padding: 12px; color: #2c3e50;">${grandTotalQty} pcs</td>
        <td style="padding: 12px; color: #27ae60;">₱${grandTotalSales.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
    </tr>`;
}

async function fetchAndRenderTopProducts() {
    const branch = document.getElementById('branch-selector').value;
    const apiURL = BRANCH_CONFIG[branch].url;
    
    const ctxTop = document.getElementById('topProductsChart').getContext('2d');
    
    const loadingOverlay = document.getElementById('product-chart-loading');
    const tableLoadingOverlay = document.getElementById('table-chart-loading');
    
    loadingOverlay.style.display = 'flex';
    tableLoadingOverlay.style.display = 'flex';

    const filterType = document.getElementById('product-date-type').value;
    const targetDay = document.getElementById('product-date-day').value;
    const targetMonth = document.getElementById('product-date-month').value;

    const tableFilterType = document.getElementById('table-date-type').value;
    const tableTargetDay = document.getElementById('table-date-day').value;
    const tableTargetMonth = document.getElementById('table-date-month').value;

    try {
        const warehouseCostMap = {};
        if (allInventoryData && allInventoryData.length > 0) {
            allInventoryData.forEach(invItem => {
                const invName = invItem.name || invItem[1]; 
                const invCost = invItem.cost !== undefined ? parseAmount(invItem.cost) : parseAmount(invItem[4]); 
                
                if (invName) {
                    const lookupKey = cleanItemNameForMatching(invName);
                    warehouseCostMap[lookupKey] = invCost;
                }
            });
        }

        const response = await fetch(`${apiURL}?action=getTransactions`);
        const rawMatrix = await response.json();
        
        if (!rawMatrix || rawMatrix.length <= 1) throw new Error("No items");

        globalRawTransactions = rawMatrix;
        renderDailyReport();

        const productDataMap = {};
        const tableDataMap = {};
        let currentValidDate = null;

        for (let i = 1; i < rawMatrix.length; i++) {
            const row = rawMatrix[i];
            
            // Carry forward date kung blangko ang row sa itaas nito
            if (row[0]) {
                const rowDateObj = new Date(row[0]);
                const formatted = getFormatDate(rowDateObj);
                if (formatted) currentValidDate = formatted;
            }
            
            const rowDateStr = currentValidDate;
            if (!rowDateStr) continue;

            const itemName = row[19] ? String(row[19]).trim() : "";
            const productSalesAmount = parseAmount(row[20]);
            const serviceFeeAmount = parseAmount(row[21]);
            const itemRowRevenue = productSalesAmount > 0 ? productSalesAmount : serviceFeeAmount;

            if (!itemName) continue;
            
            const lowerName = itemName.toLowerCase();
            if (lowerName.includes("discount") || lowerName.includes("additional") || lowerName === "---") {
                continue;
            }

            const cleanKey = cleanItemNameForMatching(itemName);
            const computedCostFromWarehouse = warehouseCostMap[cleanKey] || 0;

            // A. GRAPH LOGIC
            let passGraph = true;
            if (filterType === 'daily' && rowDateStr !== targetDay) passGraph = false;
            if (filterType === 'monthly' && rowDateStr.substring(0, 7) !== targetMonth) passGraph = false;

            if (passGraph) {
                if (!productDataMap[itemName]) {
                    productDataMap[itemName] = { quantity: 0, totalRevenue: 0 };
                }
                productDataMap[itemName].quantity += 1;
                productDataMap[itemName].totalRevenue += itemRowRevenue;
            }

            // B. TABLE LOGIC
            let passTable = true;
            if (tableFilterType === 'daily' && rowDateStr !== tableTargetDay) passTable = false;
            if (tableFilterType === 'monthly' && rowDateStr.substring(0, 7) !== tableTargetMonth) passTable = false;

            if (passTable) {
                if (!tableDataMap[itemName]) {
                    tableDataMap[itemName] = { 
                        quantity: 0, 
                        totalRevenue: 0, 
                        latestUnitPrice: itemRowRevenue, 
                        warehouseUnitCost: computedCostFromWarehouse 
                    };
                } else {
                    tableDataMap[itemName].latestUnitPrice = itemRowRevenue;
                    if (computedCostFromWarehouse > 0) {
                        tableDataMap[itemName].warehouseUnitCost = computedCostFromWarehouse;
                    }
                }
                tableDataMap[itemName].quantity += 1;
                tableDataMap[itemName].totalRevenue += itemRowRevenue;
            }
        }

        const graphSortedByQty = Object.entries(productDataMap).sort((a, b) => b[1].quantity - a[1].quantity);
        const tableSortedByQty = Object.entries(tableDataMap).sort((a, b) => b[1].quantity - a[1].quantity);

        const top15Products = graphSortedByQty.slice(0, 15);
        const labels = top15Products.map(item => item[0]);
        const quantities = top15Products.map(item => item[1].quantity);
        const revenues = top15Products.map(item => item[1].totalRevenue);

        if (topProductsChart) topProductsChart.destroy();

        topProductsChart = new Chart(ctxTop, {
            type: 'bar',
            data: {
                labels: labels.length > 0 ? labels : ["No Sales Data For This Period"],
                datasets: [{
                    label: 'Times Purchased (Qty)',
                    data: quantities.length > 0 ? quantities : [0],
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    metadata: revenues
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const qty = context.raw;
                                const metaRevenue = context.dataset.metadata[context.dataIndex] || 0;
                                return [
                                    `Quantity: ${qty} pcs`,
                                    `Total Sales: ₱${metaRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) { if (value % 1 === 0) { return value + ' pcs'; } }
                        }
                    }
                }
            }
        });

        const localManualCosts = getManualCostDatabase();

        top20ProcessedItems = tableSortedByQty.slice(0, 20).map(item => {
            const name = item[0];
            const qty = item[1].quantity;
            const unitPrice = item[1].latestUnitPrice;
            
            const unitCost = localManualCosts[name] !== undefined ? localManualCosts[name] : item[1].warehouseUnitCost; 

            const totalAmount = item[1].totalRevenue; 
            const totalCost = qty * unitCost; 
            const totalProfit = totalAmount - totalCost;

            return {
                name: name,
                qty: qty,
                unitPrice: unitPrice,
                unitCost: unitCost,
                totalAmount: totalAmount,
                totalCost: totalCost,
                totalProfit: totalProfit
            };
        });

        renderTable(top20ProcessedItems);

    } catch (error) {
        console.log("Failed to process data elements: ", error);
    } finally {
        loadingOverlay.style.display = 'none';
        tableLoadingOverlay.style.display = 'none';
    }
}

function filterTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredData = top20ProcessedItems.filter(item => {
        return item.name.toLowerCase().includes(searchTerm);
    });
    renderTable(filteredData);
}

window.onload = function() {
    setDefaultDates();
    fetchInventory();
    setInterval(checkPendingCount, 120000);
};