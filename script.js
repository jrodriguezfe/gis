// Variables de Estado de la Aplicación
let currentCartCount = 0;
const priceDisplay = document.getElementById('display-price');
const portionsDisplay = document.getElementById('spec-portions');
const qtyInput = document.getElementById('product-qty');
const cartCounter = document.getElementById('cart-counter');
const toast = document.getElementById('cart-toast');

// Control del Cambio de Variantes de Tamaño (Precio y Porciones Dinámicas)
document.querySelectorAll('input[name="size"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const target = e.target;
        const basePrice = parseFloat(target.dataset.price);
        const portions = target.dataset.portions;
        
        priceDisplay.textContent = `S/. ${basePrice.toFixed(2)}`;
        portionsDisplay.textContent = portions;
        
        // Reinicio defensivo de cantidad para mitigar errores de compra
        qtyInput.value = 1;
    });
});

// Gestión Dinámica de Cantidad con Límites Comerciales
function updateQty(delta) {
    let currentQty = parseInt(qtyInput.value);
    currentQty += delta;
    
    if (currentQty < 1) currentQty = 1;
    if (currentQty > 10) {
        alert('Para compras mayores a 10 unidades, por favor coordina de forma personalizada con nuestro equipo comercial vía WhatsApp.');
        currentQty = 10;
    }
    qtyInput.value = currentQty;
}

// Acción de Añadir al Carrito con Feedback Visual de Alta Gama
function addToCart() {
    const quantity = parseInt(qtyInput.value);
    
    currentCartCount += quantity;
    cartCounter.textContent = currentCartCount;
    
    // Activar Animación de Toast
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// Control Visual de la Galería de Miniaturas
function changeThumb(element, detailName) {
    document.querySelectorAll('.thumb-item').forEach(thumb => thumb.classList.remove('active'));
    element.classList.add('active');
    
    // Simulación del cambio de foco visual o inyección de src de imagen definitivo
    console.log(`Perspectiva visual del producto cambiada a: ${detailName}`);
}