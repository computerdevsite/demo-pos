const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzZZKmJ_AoLhUrM9pAjM5a5_nYl28dxoy9bwS6PorGj7GX3nUiJq_H0ofMSSJXm_Hfi/exec";

let inventory = []; 
let cart = [];

window.onload = function() {
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
        const response = await fetch(SHEETS_URL);
        const data = await response.json();
        
        if (data.error) {
            if(indicator) indicator.innerText = "(" + data.error + ")";
        } else {
            inventory = data;
            if(indicator) {
                indicator.innerText = "(Sheets Linked: " + inventory.length + " items)";
                indicator.style.color = "#27ae60";
            }
        }
    } catch (error) {
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
    barcodeInput.classList.remove('invalid-border');

    const item = inventory.find(i => i.barcode === bcValue);

    if (item) {
        document.getElementById('item_name').value = item.name;
        document.getElementById('item_price').value = item.price.toFixed(2);
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
    const price = parseFloat(document.getElementById('item_price').value);
    const barcodeValue = barcodeInput.value.trim();

    if (!name || isNaN(price)) {
        barcodeInput.classList.add('invalid-border');
        return;
    }

    barcodeInput.classList.remove('invalid-border');
    // Siniguro na ang 'name' ay kasama sa cart object
    cart.push({ id: Date.now(), barcode: barcodeValue, name: name, price: price });
    
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
        price: feeAmount
    });

    feeInput.value = '';
    // Alisin ang pula sa border kapag na-enter na nang tama
    feeInput.classList.remove('invalid-border');
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
    
    // --- DAGDAG NA LOGIC PARA SA OTHER DEDUCTIONS ---
    const otherDed = parseFloat(document.getElementById('other_deductions').value) || 0;
    
    // TINANGGAL ANG SELLER SA PREVIEW-META PARA HINDI MAG-ERROR
    const dateInput = document.getElementById('si_date').value || "---";
    document.getElementById('preview-meta').innerText = `Date: ${dateInput}`;

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
    
    // Binago ang computation ng finalTotal para kasama ang other_deductions
    const finalTotal = Math.max(0, sub - disc - otherDed);
    
    document.getElementById('subtotal-val').innerText = `₱${sub.toFixed(2)}`;
    document.getElementById('discount-val').innerText = `-₱${(disc + otherDed).toFixed(2)}`;
    document.getElementById('total-val').innerText = `₱${finalTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    
    const vatableAmount = finalTotal / 1.12;
    const vatAmount = vatableAmount * 0.12;

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
    
    // Kunin ang napiling Cashier
    const cashierInput = document.querySelector('input[name="cashier"]:checked');

    // --- CHECK KUNG MAY NAPILING CASHIER (REQUIRED) ---
    if (!cashierInput) {
        alert("Paki-pili muna ang pangalan ng Cashier (ARENAS, CLIMACO, etc.) bago i-save!");
        return;
    }

    // --- BAGONG VALIDATION PARA SA SERVICE FEE ---
    if (feeInput && feeInput.value.trim() !== "" && parseFloat(feeInput.value) > 0) {
        alert("May nakalagay na amount sa Service Fee! Paki-ENTER muna ito bago i-proceed ang sale para ma-record sa cart.");
        feeInput.focus();
        feeInput.classList.add('invalid-border');
        return;
    }

    if (!date || !si || !name || cart.length === 0) {
        alert("Kulang ang data (Check Date, SI, o Name) o walang laman ang cart!");
        return;
    }

    const totalDisplay = document.getElementById('total-val').innerText;
    const totalValue = parseFloat(totalDisplay.replace(/[₱,]/g, '')) || 0;

    // --- COMPUTATION PARA SA COLUMN Q (VATable Sales) AT R (VAT) NA MAY ROUNDING ---
    const vatableSales = (totalValue / 1.12).toFixed(2);
    const vatAmount = (vatableSales * 0.12).toFixed(2);

    btnSave.innerText = "SAVING...";
    btnSave.disabled = true;

    const transactionData = {
        date: date,
        si: si,
        tin: document.getElementById('tin_number').value,
        name: name,
        address: document.getElementById('cust_address').value,
        seller: cashierInput.value,
        total: totalValue.toFixed(2), // Naka-2 decimal places na Total
        vatable_sales: vatableSales, // Round off to 2 decimal places sa Column Q
        vat_amount: vatAmount,       // Round off to 2 decimal places sa Column R
        items: cart 
    };

    try {
        await fetch(SHEETS_URL, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            body: JSON.stringify(transactionData)
        });

        alert("SUCCESS: Transaction Saved!");

        await fetchInventory(); 

        const cashiers = document.querySelectorAll('input[name="cashier"]');
        cashiers.forEach(radio => {
            radio.checked = false;
        });

        cart = [];
        updateUI();
        
        // Idinagdag ang "other_deductions" at "manual_discount" sa listahan ng lilinisin
        ["si_number", "cust_name", "cust_address", "tin_number", "service_fee_input", "other_deductions", "manual_discount"].forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                if(id === "manual_discount" || id === "other_deductions") el.value = "0";
                else el.value = "";
            }
        });
        
    } catch (error) {
        alert("CONNECTION ERROR!");
    } finally {
        btnSave.innerText = "COMPLETE SALE";
        btnSave.disabled = false;
    }
}