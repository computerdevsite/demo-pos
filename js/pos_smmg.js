const SHEETS_URL = "https://script.google.com/macros/s/AKfycbwwkcQnmXYG_E3Z9rJGyZ9dlluJ9nPFs9GeWZt211ZyEbN0wxHf9MFjXRE6NLh0fh0t/exec";

let inventory = []; 
let cart = [];

window.onload = function() {
    // I-set ang default date sa input field pag-load ng page
    const dateInput = document.getElementById('si_date');
    if (dateInput) {
        const today = new Date();
        const formattedDate = (today.getMonth() + 1).toString().padStart(2, '0') + '/' + 
                             today.getDate().toString().padStart(2, '0') + '/' + 
                             today.getFullYear();
        dateInput.value = formattedDate;
    }
    fetchInventory();
};

// --- DATA FETCHING ---
async function fetchInventory() {
    const indicator = document.getElementById('loading-indicator');
    if(indicator) {
        indicator.style.display = 'inline';
        indicator.innerText = "(Connecting...)";
    }
    
    try {
        // Nagdagdag ng cache buster para laging updated ang makuha mula sa Sheets
        const response = await fetch(SHEETS_URL + "?action=getInventory&t=" + new Date().getTime());
        const result = await response.json();
        
        if (result.error) {
            if(indicator) indicator.innerText = "(" + result.error + ")";
        } else {
            // Kinukuha ang inventory mula sa result.inventory base sa bagong structure
            inventory = result.inventory || result || []; 
            
            if(indicator) {
                indicator.innerText = "(Sheets Linked: " + inventory.length + " items)";
                indicator.style.color = "#27ae60";
            }
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        if(indicator) {
            indicator.innerText = "(Connection Error)";
            indicator.style.color = "#e74c3c";
        }
    }
}

// --- SEARCH & ADD ---
function searchInventory() {
    const barcodeInput = document.getElementById('item_barcode');
    const bcValue = barcodeInput.value.trim();
    
    // Tinatanggal ang error class kung meron man
    barcodeInput.classList.remove('invalid-border');
    barcodeInput.classList.remove('invalid-field');

    // Case-insensitive at string-based search
    const item = inventory.find(i => String(i.barcode).trim() === bcValue);

    if (item) {
        document.getElementById('item_name').value = item.name;
        document.getElementById('item_price').value = parseFloat(item.price).toFixed(2);
    } else {
        document.getElementById('item_name').value = "";
        document.getElementById('item_price').value = "";
    }
}

function handleEnter(e) { 
    if (e.key === "Enter") {
        e.preventDefault();
        addItem(); 
    }
}

function addItem() {
    const barcodeInput = document.getElementById('item_barcode');
    const name = document.getElementById('item_name').value;
    const priceStr = document.getElementById('item_price').value;
    const price = parseFloat(priceStr);
    const barcodeValue = barcodeInput.value.trim();

    if (!name || isNaN(price)) {
        barcodeInput.classList.add('invalid-field');
        return;
    }

    barcodeInput.classList.remove('invalid-field');
    // Idinagdag ang qty: 1 para sa standard data structure
    cart.push({ id: Date.now(), barcode: barcodeValue, name: name, price: price, qty: 1 });
    
    barcodeInput.value = '';
    document.getElementById('item_name').value = '';
    document.getElementById('item_price').value = '';
    barcodeInput.focus();
    updateUI();
}

// --- SERVICE FEE (IAYC / NON-IAYC) ---
function handleServiceEnter(e) {
    if (e.key === "Enter") {
        e.preventDefault();
        addServiceFee();
    }
}

function addServiceFee() {
    const feeInput = document.getElementById('service_fee_input');
    const selectedType = document.querySelector('input[name="customer"]:checked');
    const feeAmount = parseFloat(feeInput.value);
    
    if (isNaN(feeAmount) || feeAmount <= 0) {
        alert("Please enter a valid Service Fee amount.");
        return;
    }

    if (!selectedType) {
        alert("Please select a Customer Type (IAYC / NON-IAYC).");
        return;
    }

    cart.push({
        id: Date.now(),
        barcode: "SERVICE",
        name: selectedType.value,
        price: feeAmount,
        qty: 1
    });

    feeInput.value = '';
    updateUI();
}

function removeItem(id) {
    cart = cart.filter(i => i.id !== id);
    updateUI();
}

// --- UI UPDATES ---
function updateUI() {
    const list = document.getElementById('cart-list');
    const disc = parseFloat(document.getElementById('manual_discount').value) || 0;
    const otherDed = parseFloat(document.getElementById('other_deductions').value) || 0;
    
    const dateInput = document.getElementById('si_date').value || "---";
    const cashierInput = document.querySelector('input[name="cashier"]:checked');
    const cashierName = cashierInput ? cashierInput.value : "---";
    
    // I-update ang metadata preview
    document.getElementById('preview-meta').innerText = `Date: ${dateInput} | Seller: ${cashierName}`;

    let sub = 0;
    let html = '<div class="cart-row cart-header"><span>#</span><span>Barcode</span><span>Item</span><span>Price</span><span></span></div>';
    
    cart.forEach((item, i) => {
        sub += item.price;
        html += `<div class="cart-row">
            <span>${i+1}</span>
            <span class="cart-barcode">${item.barcode}</span>
            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</span>
            <span>₱${item.price.toFixed(2)}</span>
            <button class="btn-remove" onclick="removeItem(${item.id})">✕</button>
        </div>`;
    });

    list.innerHTML = html;
    
    const totalDeductions = disc + otherDed;
    const finalTotal = Math.max(0, sub - totalDeductions);
    
    document.getElementById('subtotal-val').innerText = `₱${sub.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('discount-val').innerText = `-₱${totalDeductions.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('total-val').innerText = `₱${finalTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    
    // VAT COMPUTATION (12%)
    const vatableAmount = finalTotal / 1.12;
    const vatAmount = finalTotal - vatableAmount;

    document.getElementById('VATable-val').innerText = `₱${vatableAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('VAT-val').innerText = `₱${vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    list.scrollTop = list.scrollHeight;
}

function emptyCart() { if(confirm("Void current transaction?")) { cart = []; updateUI(); } }

// --- FINAL PROCESS INVOICE ---
async function processInvoice() {
    const btnSave = document.querySelector('.btn-save');
    const date = document.getElementById('si_date').value;
    const si = document.getElementById('si_number').value;
    const name = document.getElementById('cust_name').value;
    const feeInput = document.getElementById('service_fee_input');
    const cashierInput = document.querySelector('input[name="cashier"]:checked');

    // VALIDATIONS
    if (!cashierInput) {
        alert("Paki-pili muna ang pangalan ng Cashier (ARENAS, CLIMACO, etc.) bago i-save!");
        return;
    }

    if (feeInput && feeInput.value.trim() !== "" && parseFloat(feeInput.value) > 0) {
        const confirmFee = confirm("May nakalagay sa Service Fee box pero hindi pa na-ENTER. Isasama ba ito? (I-cancel para manual na i-ENTER)");
        if (!confirmFee) {
            feeInput.focus();
            return;
        } else {
            addServiceFee(); // Awtomatikong isasama kung nag-confirm
        }
    }

    if (!date || !si || !name || cart.length === 0) {
        alert("Kulang ang data (Check Date, SI, o Name) o walang laman ang cart!");
        return;
    }

    const totalDisplay = document.getElementById('total-val').innerText;
    const totalValue = parseFloat(totalDisplay.replace(/[₱,]/g, '')) || 0;

    const vatableSales = (totalValue / 1.12).toFixed(2);
    const vatAmount = (totalValue - parseFloat(vatableSales)).toFixed(2);

    btnSave.innerText = "SAVING...";
    btnSave.disabled = true;

    // Inihanda ang data payload para sa Google Sheets
    const transactionData = {
        action: "save_transaction", // Action tag para sa doPost logic
        date: date,
        si: si,
        tin: document.getElementById('tin_number').value || "N/A",
        name: name,
        address: document.getElementById('cust_address').value || "N/A",
        seller: cashierInput.value,
        total: totalValue.toFixed(2),
        vatable_sales: vatableSales,
        vat_amount: vatAmount,
        items: cart.map(item => ({
            barcode: item.barcode,
            name: item.name,
            price: item.price,
            qty: 1
        }))
    };

    try {
        await fetch(SHEETS_URL, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            body: JSON.stringify(transactionData)
        });

        alert("SUCCESS: Transaction Saved!");

        // Refresh inventory para updated ang stocks
        await fetchInventory(); 

        // Reset form fields
        const cashiers = document.querySelectorAll('input[name="cashier"]');
        cashiers.forEach(radio => radio.checked = false);

        cart = [];
        
        // Pag-clear ng lahat ng inputs
        ["si_number", "cust_name", "cust_address", "tin_number", "service_fee_input", "other_deductions", "manual_discount"].forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                if(id === "manual_discount" || id === "other_deductions") el.value = "0";
                else el.value = "";
            }
        });
        
        updateUI();
        
    } catch (error) {
        console.error("Post Error:", error);
        alert("CONNECTION ERROR: Hindi naisave ang transaction.");
    } finally {
        btnSave.innerText = "COMPLETE SALE";
        btnSave.disabled = false;
    }
}