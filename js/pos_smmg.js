const SHEETS_URL = "https://script.google.com/macros/s/AKfycbz8BC14a1Y97AXLzmv0lLO52Nl2-FNqAqOPwEsqCoUn3lCfL_zRtw_-NjaSn924Vgi3/exec";
    
    let inventory = []; 
    let cart = [];

    window.onload = function() {
        fetchInventory();
    };

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
        cart.push({ id: Date.now(), barcode: barcodeValue, name: name, price: price });
        
        barcodeInput.value = '';
        document.getElementById('item_name').value = '';
        document.getElementById('item_price').value = '';
        barcodeInput.focus();
        updateUI();
    }

    function removeItem(id) {
        cart = cart.filter(i => i.id !== id);
        updateUI();
    }

    function updateUI() {
        const list = document.getElementById('cart-list');
        const disc = parseFloat(document.getElementById('manual_discount').value) || 0;
        const selectedCashier = document.querySelector('input[name="cashier"]:checked');
        const dateInput = document.getElementById('si_date').value || "---";
        
        document.getElementById('preview-meta').innerText = `Date: ${dateInput} | Seller: ${selectedCashier ? selectedCashier.value : "---"}`;

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
        document.getElementById('subtotal-val').innerText = `₱${sub.toFixed(2)}`;
        document.getElementById('discount-val').innerText = `-₱${disc.toFixed(2)}`;
        document.getElementById('total-val').innerText = `₱${Math.max(0, sub - disc).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
		
		

    }

    function emptyCart() { if(confirm("Void current transaction?")) { cart = []; updateUI(); } }

    function processInvoice() {
        const date = document.getElementById('si_date').value.trim();
        const si = document.getElementById('si_number').value.trim();
        const name = document.getElementById('cust_name').value.trim();
        const address = document.getElementById('cust_address').value.trim();
        const cashier = document.querySelector('input[name="cashier"]:checked');

        // TIN is NOT included here
        if (!date || !si || !name || !address) {
            alert("ERROR: Date, SI Number, Customer Name, and Address are REQUIRED.");
            return;
        }

        if (!cashier) {
            alert("ERROR: Please select Seller ID.");
            return;
        }

        if (cart.length === 0) {
            alert("ERROR: No items in cart.");
            return;
        }
        
        alert("SUCCESS: Transaction Saved.");
        
        cart = [];
        document.getElementById('si_date').value = "";
        document.getElementById('si_number').value = "";
        document.getElementById('tin_number').value = "";
        document.getElementById('cust_name').value = "";
        document.getElementById('cust_address').value = "";
        if(cashier) cashier.checked = false;
        
        updateUI();
    }