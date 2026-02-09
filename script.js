// Check if data exists in localStorage
const storedData = localStorage.getItem('cafeMenuData');
const menuData = storedData ? JSON.parse(storedData) : {
    "cafeName": "Café Aimée",
    "location": "60 Rue Bayen, 75017 Paris",
    "categories": [
        {
            "id": "espresso",
            "label": "Espresso",
            "items": [
                { "id": "espresso", "name": "Espresso / Allongé", "price": 2.5 },
                { "id": "americano", "name": "Double / Americano", "price": 3.5 },
                { "id": "noisette", "name": "Noisette", "price": 3 },
                { "id": "macchiato", "name": "Macchiato", "price": 3.5 },
                { "id": "cappuccino", "name": "Cappuccino / Latte", "price": 4.5 },
                { "id": "latte-large", "name": "Latte (grand)", "price": 5 },
                { "id": "flat-white", "name": "Flat White", "price": 5 },
                { "id": "mocha", "name": "Mocha", "price": 5.5 }
            ]
        },
        {
            "id": "flavored-latte",
            "label": "Grand Latte aromatisé",
            "items": [
                {
                    "id": "flavored-latte",
                    "name": "Grand Latte aromatisé",
                    "price": 5.5,
                    "options": ["Vanille", "Caramel", "Caramel salé", "Noisette", "Pumpkin spice"]
                }
            ]
        },
        {
            "id": "matcha",
            "label": "Matcha",
            "items": [
                { "id": "matcha-latte", "name": "Matcha Latte", "price": 5.5 },
                { "id": "iced-matcha-latte", "name": "Iced Matcha Latte", "price": 5.5 },
                { "id": "matcha-fraise", "name": "Matcha fraise (glacé)", "price": 6 },
                { "id": "matcha-mangue", "name": "Matcha mangue (glacé)", "price": 6 },
                { "id": "matcha-myrtille", "name": "Matcha myrtille (glacé)", "price": 6 },
                { "id": "matcha-framboise", "name": "Matcha framboise (glacé)", "price": 6 },
                { "id": "cremeux-matcha-coco", "name": "Crémeux matcha coco", "price": 6 }
            ]
        },
        {
            "id": "brew",
            "label": "Brew",
            "items": [
                { "id": "cold-brew", "name": "Cold brew", "price": 5 },
                { "id": "batch-brew", "name": "Batch brew", "price": 4.2 },
                { "id": "cascara", "name": "Cascara", "price": 4 }
            ]
        },
        {
            "id": "tea",
            "label": "Thé",
            "items": [
                {
                    "id": "infusion-itany",
                    "name": "Infusion — Itany x L'artisan parfumeur",
                    "description": "Rose, eucalyptus, menthe suave, feuille d’oranger",
                    "price": 4.5
                },
                {
                    "id": "the-vert-alamo",
                    "name": "Thé vert \"Alamo\"",
                    "description": "Amande et sarrasin grillé",
                    "price": 4.5
                },
                {
                    "id": "the-noir-serio",
                    "name": "Thé noir \"Sério\"",
                    "description": "Thé noir, Cerise, Amande, Piment",
                    "price": 4.5
                }
            ]
        },
        {
            "id": "cookies",
            "label": "Cookies",
            "items": [
                { "id": "cookie", "name": "Cookies (au choix)", "price": 3.8 }
            ]
        }
    ]
};

// Function to save data (useful for dashboard)
function saveMenuData(newData) {
    localStorage.setItem('cafeMenuData', JSON.stringify(newData));
    // Optional: reload page to see changes
    // location.reload(); 
}

// Cart State
let cart = [];

function renderMenu() {
    const container = document.getElementById('menu-container');
    if (!container) return;
    container.innerHTML = '';

    menuData.categories.forEach(category => {
        const categoryElement = document.createElement('article');
        categoryElement.className = 'category-section';

        const itemsHtml = category.items.map(item => {
            const descriptionHtml = item.description
                ? `<div class="item-description">${item.description}</div>`
                : '';

            const optionsHtml = item.options
                ? `<div class="item-options">Options: ${item.options.join(', ')}</div>`
                : '';

            const isPaused = localStorage.getItem('cafeServicePaused') === 'true';

            return `
                <li class="menu-item ${isPaused ? 'item-disabled' : ''}" data-id="${item.id}">
                    <div class="item-details">
                        <span class="item-name">${item.name}</span>
                        ${descriptionHtml}
                        ${optionsHtml}
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span class="item-price">${item.price.toFixed(2)}€</span>
                        <button class="add-to-cart" ${isPaused ? 'disabled' : ''} onclick="addToCart('${item.id}', '${item.name}', ${item.price})">
                            <ion-icon name="add-outline"></ion-icon>
                        </button>
                    </div>
                </li>
            `;
        }).join('');

        categoryElement.innerHTML = `
            <h2 class="category-title">${category.label}</h2>
            <ul class="menu-list">
                ${itemsHtml}
            </ul>
        `;
        container.appendChild(categoryElement);
    });
}

// Cart Functions
function addToCart(id, name, price) {
    const existing = cart.find(item => item.id === id && !item.note);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ id, name, price, qty: 1, note: '' });
    }
    updateCartUI();
    // Subtle animation on cart button
    const btn = document.getElementById('cart-button');
    btn.style.transform = 'scale(1.2)';
    setTimeout(() => btn.style.transform = '', 200);
}

function updateCartUI() {
    const count = cart.reduce((acc, item) => acc + item.qty, 0);
    document.getElementById('cart-count').textContent = count;

    const itemsContainer = document.getElementById('cart-items');
    const totalValue = document.getElementById('cart-total-value');
    const checkoutBtn = document.getElementById('checkout-btn');

    const pickupContainer = document.getElementById('pickup-time-container');

    const isPaused = localStorage.getItem('cafeServicePaused') === 'true';

    if (cart.length === 0) {
        itemsContainer.innerHTML = '<div class="empty-cart-msg">Votre panier est vide</div>';
        totalValue.textContent = '0.00€';
        checkoutBtn.disabled = true;
        if (pickupContainer) pickupContainer.style.display = 'none';
        return;
    }

    if (pickupContainer) {
        pickupContainer.style.display = isPaused ? 'none' : 'block';
        const pickupInput = document.getElementById('pickup-time');
        if (pickupInput && !pickupInput.value) {
            // Set default time to now + 10 mins
            const now = new Date();
            now.setMinutes(now.getMinutes() + 10);
            pickupInput.value = now.getHours().toString().padStart(2, '0') + ':' +
                now.getMinutes().toString().padStart(2, '0');
        }
    }

    checkoutBtn.disabled = isPaused;
    if (isPaused) {
        checkoutBtn.textContent = 'Service en pause';
    } else {
        checkoutBtn.textContent = 'Commander';
    }

    let total = 0;

    itemsContainer.innerHTML = cart.map((item, index) => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        return `
            <div class="cart-item">
                <div class="cart-item-info" style="flex: 1;">
                    <h4>${item.name}</h4>
                    <p>${item.price.toFixed(2)}€ x ${item.qty}</p>
                    <input type="text" class="item-note-input" placeholder="Ajouter un commentaire..." 
                        value="${item.note || ''}" 
                        onchange="updateItemNote(${index}, this.value)">
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateQty(${index}, -1)"><ion-icon name="remove-outline"></ion-icon></button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="updateQty(${index}, 1)"><ion-icon name="add-outline"></ion-icon></button>
                </div>
            </div>
        `;
    }).join('');

    totalValue.textContent = total.toFixed(2) + '€';
}

function updateItemNote(index, note) {
    cart[index].note = note;
}

function updateQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    updateCartUI();
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function submitOrder() {
    if (cart.length === 0) return;

    const pickupInput = document.getElementById('pickup-time');
    const pickupTime = pickupInput ? pickupInput.value : null;

    if (!pickupTime) {
        alert('Veuillez sélectionner une heure de passage pour fluidifier le service. Merci !');
        if (pickupInput) pickupInput.focus();
        return;
    }

    const user = localStorage.getItem('cafeUserIdentity');

    const nextId = getNextOrderId();

    const order = {
        id: nextId,
        customer: user || 'Invité',
        date: new Date().toISOString(),
        pickupTime: pickupTime,
        items: [...cart],
        total: cart.reduce((acc, item) => acc + (item.price * item.qty), 0),
        status: 'En attente'
    };

    // Save to localStorage for the dashboard
    const existingOrders = JSON.parse(localStorage.getItem('cafeOrders') || '[]');
    existingOrders.unshift(order);
    localStorage.setItem('cafeOrders', JSON.stringify(existingOrders));

    // Track this order ID for notifications
    trackOrderForNotification(order.id);

    // Success response
    alert('Merci ! Votre commande a été transmise au comptoir.');
    cart = [];
    updateCartUI();
    toggleCart();

    // Trigger update on dashboard if open in another tab
    window.dispatchEvent(new Event('storage'));
}

// Order Notifications Logic
function trackOrderForNotification(orderId) {
    const tracked = JSON.parse(sessionStorage.getItem('myActiveOrders') || '[]');
    tracked.push(orderId);
    sessionStorage.setItem('myActiveOrders', JSON.stringify(tracked));
}

function checkOrderNotifications() {
    const tracked = JSON.parse(sessionStorage.getItem('myActiveOrders') || '[]');
    const readyDot = document.getElementById('order-ready-dot');

    if (tracked.length === 0) {
        if (readyDot) readyDot.style.display = 'none';
        return;
    }

    const allOrders = JSON.parse(localStorage.getItem('cafeOrders') || '[]');
    const stillPending = [];
    let hasReady = false;

    tracked.forEach(orderId => {
        const order = allOrders.find(o => o.id === orderId);
        if (order) {
            if (order.status === 'Prêt') {
                showNotification(`Votre commande ${order.id} est prête ! Venez la chercher au comptoir.`);
                hasReady = true;
                // No longer track once notified
            } else {
                stillPending.push(orderId);
            }
        }
    });

    if (readyDot) readyDot.style.display = hasReady ? 'block' : 'none';

    sessionStorage.setItem('myActiveOrders', JSON.stringify(stillPending));
    updateOrderStatusList();
}

function showNotification(message) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
        <ion-icon name="cafe-outline"></ion-icon>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove from DOM after animation finishes
    setTimeout(() => {
        if (toast.parentNode) {
            container.removeChild(toast);
        }
    }, 5000);
}

// Render when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    renderMenu();
    checkBroadcast();
    checkUserIdentity();
    checkServiceStatus();

    // Sync if admin changes data in another tab
    window.addEventListener('storage', (e) => {
        if (e.key === 'cafeMenuData' || e.key === 'cafeBroadcast' || e.key === 'cafeServicePaused') {
            location.reload(); // Simplest way to resync all data
        }
        if (e.key === 'cafeOrders') {
            checkOrderNotifications();
            updateOrderStatusList();
        }
    });

    // Initial check
    checkOrderNotifications();
    checkDailyReset();
    trackSiteVisit();

    // Vérification toutes les minutes pour le reset automatique à minuit
    setInterval(checkDailyReset, 60000);
});

function trackSiteVisit() {
    const today = new Date().toLocaleDateString('fr-FR');
    const hour = new Date().getHours().toString().padStart(2, '0');

    let stats = JSON.parse(localStorage.getItem('cafeVisitStats') || '{}');

    if (!stats[today]) {
        stats[today] = {};
    }

    if (!stats[today][hour]) {
        stats[today][hour] = 0;
    }

    stats[today][hour]++;
    localStorage.setItem('cafeVisitStats', JSON.stringify(stats));
}

function checkDailyReset() {
    const today = new Date().toLocaleDateString('fr-FR');
    const lastDate = localStorage.getItem('cafeLastOrderDate');

    if (lastDate && lastDate !== today) {
        console.log("Nouveau jour détecté. Réinitialisation des données éphémères...");
        localStorage.setItem('cafeOrders', '[]');
        localStorage.setItem('cafeSystemLogs', '[]');
        localStorage.setItem('cafeOrderCounter', '0');

        // On force un rafraîchissement si nécessaire
        if (typeof renderMenu === 'function') renderMenu();
    }
    localStorage.setItem('cafeLastOrderDate', today);
}

function checkServiceStatus() {
    const isPaused = localStorage.getItem('cafeServicePaused') === 'true';
    const banner = document.getElementById('broadcast-banner');

    if (isPaused) {
        // Show a pause message if no broadcast is active
        if (banner && !localStorage.getItem('cafeBroadcast')) {
            banner.textContent = "💤 Le service est temporairement en pause. Nous revenons très vite !";
            banner.style.display = 'block';
            banner.style.background = '#E74C3C';
        }

        // Disable cart button visually
        const cartBtn = document.getElementById('cart-button');
        if (cartBtn) cartBtn.style.opacity = '0.5';
    }
}

function getNextOrderId() {
    checkDailyReset(); // Ensure we are on the right day before incrementing
    const counter = (parseInt(localStorage.getItem('cafeOrderCounter') || '0')) + 1;
    localStorage.setItem('cafeOrderCounter', counter);
    return `#${counter}`;
}

function checkUserIdentity() {
    const user = localStorage.getItem('cafeUserIdentity');
    const display = document.getElementById('user-display');
    const loginLink = document.getElementById('user-login-link');
    const nameTag = document.getElementById('user-name-tag');

    if (user && display && loginLink && nameTag) {
        nameTag.textContent = user;
        display.style.display = 'flex';
        loginLink.style.display = 'none';
    } else if (display && loginLink) {
        display.style.display = 'none';
        loginLink.style.display = 'block';
    }
}

function userLogout() {
    if (confirm('Voulez-vous vous déconnecter ?')) {
        localStorage.removeItem('cafeUserIdentity');
        checkUserIdentity();
    }
}

function checkBroadcast() {
    const msg = localStorage.getItem('cafeBroadcast');
    const banner = document.getElementById('broadcast-banner');
    if (msg && banner) {
        banner.textContent = msg;
        banner.style.display = 'block';
    }
}

function toggleOrderStatus() {
    const dropdown = document.getElementById('order-status-dropdown');
    if (!dropdown) return;

    dropdown.classList.toggle('active');
    if (dropdown.classList.contains('active')) {
        updateOrderStatusList();
        // Clear ready dot when opening
        const readyDot = document.getElementById('order-ready-dot');
        if (readyDot) readyDot.style.display = 'none';
    }
}

function updateOrderStatusList() {
    const list = document.getElementById('order-status-list');
    if (!list) return;

    const tracked = JSON.parse(sessionStorage.getItem('myActiveOrders') || '[]');
    const allOrders = JSON.parse(localStorage.getItem('cafeOrders') || '[]');

    // Find all orders that belong to the current user (if any) or are tracked
    const user = localStorage.getItem('cafeUserIdentity');
    const myOrders = allOrders.filter(o => tracked.includes(o.id) || (user && o.customer === user));

    if (myOrders.length === 0) {
        list.innerHTML = '<div style="padding: 20px; text-align: center; color: #999; font-size: 0.8rem;">Aucune commande active</div>';
        return;
    }

    list.innerHTML = myOrders.map(order => {
        const statusClass = order.status === 'Prêt' ? 'ready' : 'pending';
        const time = new Date(order.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="status-item">
                <div class="status-item-header">
                    <span class="status-item-id">${order.id}</span>
                    <span class="status-item-badge ${statusClass}">${order.status}</span>
                </div>
                <div class="status-item-time">${time} - ${order.items.length} article(s)</div>
            </div>
        `;
    }).join('');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('order-status-dropdown');
    const trigger = document.getElementById('order-status-trigger');
    if (dropdown && dropdown.classList.contains('active') && !dropdown.contains(e.target) && !trigger.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});


