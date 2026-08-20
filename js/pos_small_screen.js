// 1. Kunin ang elements mula sa HTML
const btn = document.getElementById('hamburgerNav');
const menu = document.querySelector('.sidebar');
const btnBck = document.getElementById('hamburgerNavBck');
const checkOut = document.querySelector('.checkout-btn');
const checkItem = document.querySelector('.right-panel');

// 2. Lagyan ng event listener ang button
btn.addEventListener('click', function() {
  
  // 3. I-check ang kasalukuyang display state
  if (menu.style.display === 'block') {
    menu.style.display = 'none';
    
  } else {
    menu.style.display = 'block';
    
  }
  
});

// Function para sa 'close' button (btnBck)
btnBck.addEventListener('click', function() {
  // Ibabalik sa original state (naka-hide ang menu, visible ang open button)
  menu.style.display = 'none';
  
});

// Function para sa 'check out' button (checkOut)
checkOut.addEventListener('click', function() {
  if (checkItem.style.display === 'block') {
    checkItem.style.display = 'none';
    
  } else {
    checkItem.style.display = 'block';
    
  }
  
});

