document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    setupNavigation();
    renderActivityLog();
    renderMenuEditor();
    loadBroadcast();
    renderOrders();
    renderStats();

    // Listen for new orders and data changes from other tabs
    window.addEventListener('storage', () => {
        renderOrders();
        renderActivityLog();
        renderStats();
    });

    initDraggable();
    initServiceStatus();
    checkDailyReset();

    // Vérification toutes les minutes pour le reset à minuit
    setInterval(checkDailyReset, 60000);
});

let fluxChartInstance = null;

function checkDailyReset() {
    const today = new Date().toLocaleDateString('fr-FR');
    const lastDate = localStorage.getItem('cafeLastOrderDate');

    if (lastDate && lastDate !== today) {
        console.log("Nouveau jour détecté (Dashboard). Réinitialisation...");
        localStorage.setItem('cafeOrders', '[]');
        localStorage.setItem('cafeSystemLogs', '[]');
        localStorage.setItem('cafeOrderCounter', '0');

        // Refresh UI
        renderOrders();
        renderActivityLog();
        renderStats();
        if (typeof renderAnalytics === 'function') renderAnalytics();
    }
    localStorage.setItem('cafeLastOrderDate', today);
}

const defaultStats = [
    { title: 'Chiffre du jour', value: '1,240.50€', change: '+12% vs hier', type: 'positive', icon: 'cash-outline' },
    { title: 'Clients', value: '84', change: '+5% vs hier', type: 'positive', icon: 'people-outline' },
    { title: 'Cafés servis', value: '215', change: 'Stable', type: 'neutral', icon: 'cafe-outline' },
    { title: 'Flux Visiteurs', value: '0', change: 'En direct', type: 'neutral', icon: 'trending-up-outline' }
];

function renderStats() {
    const grid = document.querySelector('.stats-grid');
    if (!grid) return;

    let stats = JSON.parse(localStorage.getItem('dashboard-stats-data'));
    if (!stats) {
        stats = defaultStats;
        localStorage.setItem('dashboard-stats-data', JSON.stringify(stats));
    }

    // Sort according to saved visual order if exists
    const savedOrder = JSON.parse(localStorage.getItem('dashboard-stats-order'));
    if (savedOrder) {
        stats.sort((a, b) => savedOrder.indexOf(a.title) - savedOrder.indexOf(b.title));
    }

    // Dynamic values from orders
    const orders = JSON.parse(localStorage.getItem('cafeOrders') || '[]');
    const totalToday = orders.reduce((acc, o) => acc + o.total, 0);
    const clientsCount = orders.length;
    const itemsCount = orders.reduce((acc, o) => acc + o.items.reduce((sum, i) => sum + i.qty, 0), 0);

    grid.innerHTML = stats.map(stat => {
        let displayValue = stat.value;
        let onClickAction = '';

        if (stat.title === 'Chiffre du jour') displayValue = totalToday.toFixed(2) + '€';
        if (stat.title === 'Clients') displayValue = clientsCount;
        if (stat.title === 'Cafés servis') {
            displayValue = itemsCount;
            onClickAction = 'onclick="showDrinkDetails()" style="cursor: pointer;"';
        }
        if (stat.title === 'Flux Visiteurs') {
            const today = new Date().toLocaleDateString('fr-FR');
            const visits = JSON.parse(localStorage.getItem('cafeVisitStats') || '{}');
            const todayVisits = visits[today] || {};
            displayValue = Object.values(todayVisits).reduce((a, b) => a + b, 0);
            onClickAction = 'onclick="showVisitFlux()" style="cursor: pointer;"';
        }

        return `
            <div class="stat-card" data-title="${stat.title}" ${onClickAction}>
                <div class="stat-icon combined"><ion-icon name="${stat.icon}"></ion-icon></div>
                <div class="stat-details" style="flex: 1;">
                    <h3>${stat.title}</h3>
                    <p class="stat-value">${displayValue}</p>
                    <p class="stat-change ${stat.type}">${stat.change}</p>
                </div>
                <button class="action-btn delete-stat" onclick="deleteStat('${stat.title}')" style="align-self: flex-start; opacity: 0.3;">
                    <ion-icon name="close-circle-outline"></ion-icon>
                </button>
            </div>
        `;
    }).join('');
}

function showDrinkDetails() {
    const orders = JSON.parse(localStorage.getItem('cafeOrders') || '[]');
    const modal = document.getElementById('details-modal');
    const body = document.getElementById('modal-body');
    const title = document.getElementById('modal-title');

    if (title) title.textContent = "Détails des consommations";

    // Aggregate items
    const drinkStats = {};
    orders.forEach(order => {
        order.items.forEach(item => {
            if (drinkStats[item.name]) {
                drinkStats[item.name] += item.qty;
            } else {
                drinkStats[item.name] = item.qty;
            }
        });
    });

    const drinkList = Object.entries(drinkStats).sort((a, b) => b[1] - a[1]);

    if (drinkList.length === 0) {
        body.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Aucune consommation pour le moment.</p>';
    } else {
        body.innerHTML = drinkList.map(([name, qty]) => `
            <div class="drink-detail-item">
                <span class="drink-name">${name}</span>
                <span class="drink-qty"><strong>${qty}</strong> servi(s)</span>
            </div>
        `).join('');
    }

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('details-modal').classList.remove('active');
}

function showVisitFlux() {
    const today = new Date().toLocaleDateString('fr-FR');
    const visits = JSON.parse(localStorage.getItem('cafeVisitStats') || '{}');
    const todayVisits = visits[today] || {};

    const modal = document.getElementById('details-modal');
    const body = document.getElementById('modal-body');
    const title = document.getElementById('modal-title');

    title.textContent = "Flux de visites - " + today;

    // Sort hours
    const hours = Object.keys(todayVisits).sort();

    if (hours.length === 0) {
        body.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Aucune visite enregistrée aujourd\'hui.</p>';
    } else {
        const maxVal = Math.max(...Object.values(todayVisits));

        body.innerHTML = hours.map(h => {
            const count = todayVisits[h];
            const width = (count / maxVal) * 100;
            return `
                <div style="margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.9rem;">
                        <span><strong>${h}h00</strong></span>
                        <span>${count} visite(s)</span>
                    </div>
                    <div style="height: 12px; background: #eee; border-radius: 6px; overflow: hidden;">
                        <div style="height: 100%; width: ${width}%; background: var(--color-accent); border-radius: 6px; transition: width 0.5s ease;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    modal.classList.add('active');
}

function addStat() {
    const title = prompt("Titre de la statistique (ex: Pourboires) :");
    if (!title) return;
    const value = prompt("Valeur actuelle (ex: 45.00€) :");
    const icon = prompt("Icône (ex: heart-outline, star-outline, wallet-outline) :", "analytics-outline");

    let stats = JSON.parse(localStorage.getItem('dashboard-stats-data')) || defaultStats;
    stats.push({ title, value, change: 'Nouveau', type: 'neutral', icon });
    localStorage.setItem('dashboard-stats-data', JSON.stringify(stats));
    renderStats();
}

function deleteStat(title) {
    if (confirm('Retirer cette statistique ?')) {
        let stats = JSON.parse(localStorage.getItem('dashboard-stats-data')) || defaultStats;
        stats = stats.filter(s => s.title !== title);
        localStorage.setItem('dashboard-stats-data', JSON.stringify(stats));
        renderStats();
    }
}

function initDraggable() {
    // 1. Sidebar Navigation Draggable
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (sidebarNav) {
        new Sortable(sidebarNav, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: () => {
                const order = Array.from(sidebarNav.children).map(el => el.getAttribute('data-tab') || 'return');
                localStorage.setItem('dashboard-nav-order', JSON.stringify(order));
            }
        });
        // Restore order
        const savedOrder = JSON.parse(localStorage.getItem('dashboard-nav-order'));
        if (savedOrder) {
            savedOrder.forEach(tabId => {
                const item = sidebarNav.querySelector(`[data-tab="${tabId}"]`) || sidebarNav.querySelector('.return-link');
                if (item) sidebarNav.appendChild(item);
            });
        }
    }

    // 2. Stats Cards Draggable (Overview)
    const statsGrid = document.querySelector('.stats-grid');
    if (statsGrid) {
        new Sortable(statsGrid, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: () => {
                const order = Array.from(statsGrid.children).map(el => el.querySelector('h3').textContent);
                localStorage.setItem('dashboard-stats-order', JSON.stringify(order));
            }
        });
        // Restore order
        const savedOrder = JSON.parse(localStorage.getItem('dashboard-stats-order'));
        if (savedOrder) {
            savedOrder.forEach(title => {
                const card = Array.from(statsGrid.children).find(el => el.querySelector('h3').textContent === title);
                if (card) statsGrid.appendChild(card);
            });
        }
    }

    // 3. Menu Editor Categories (will be called again after renderMenuEditor)
    initMenuSortable();
}

function initMenuSortable() {
    const menuGrid = document.getElementById('dashboard-menu-grid');
    if (menuGrid) {
        new Sortable(menuGrid, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            handle: '.editor-card-header', // Use header as handle
            onEnd: () => {
                const order = Array.from(menuGrid.children).map(el => el.getAttribute('data-category-id'));
                localStorage.setItem('dashboard-menu-order', JSON.stringify(order));

                // Also update the actual menuData order
                const newCategories = [];
                order.forEach(id => {
                    const cat = menuData.categories.find(c => c.id === id);
                    if (cat) newCategories.push(cat);
                });
                menuData.categories = newCategories;
                saveMenuData(menuData);
            }
        });
    }
}

function checkSession() {
    const hasSession = localStorage.getItem('cafeStaffSession');
    if (!hasSession) {
        window.location.href = 'login.html';
    }
}

function logout() {
    if (confirm('Voulez-vous vous déconnecter ?')) {
        localStorage.removeItem('cafeStaffSession');
        window.location.href = 'login.html';
    }
}

function renderOrders() {
    const ordersContainer = document.getElementById('orders');
    if (!ordersContainer) return;

    let orders = JSON.parse(localStorage.getItem('cafeOrders') || '[]');

    if (orders.length === 0) {
        ordersContainer.innerHTML = `
            <div class="empty-state">
                <ion-icon name="receipt-outline"></ion-icon>
                <h3>Aucune commande</h3>
                <p>Les commandes apparaîtront ici dès qu'un client validera son panier.</p>
            </div>
        `;
        return;
    }

    // Sort: Pending orders with earlier pickup times first, then ready orders
    orders.sort((a, b) => {
        if (a.status !== b.status) {
            return a.status === 'En attente' ? -1 : 1;
        }
        if (a.pickupTime && b.pickupTime) {
            return a.pickupTime.localeCompare(b.pickupTime);
        }
        return new Date(b.date) - new Date(a.date);
    });

    ordersContainer.innerHTML = `
        <div class="orders-list">
            ${orders.map(order => {
        const date = new Date(order.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const statusClass = order.status === 'Prêt' ? 'status-ready' : 'status-pending';

        return `
                    <div class="order-card ${statusClass}" data-id="${order.id}">
                        <div class="order-header">
                            <span class="order-id">${order.id} - <strong>${order.customer || 'Invité'}</strong></span>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                ${order.pickupTime ? `<span class="pickup-time-badge" title="Heure de passage prévue"><ion-icon name="time-outline"></ion-icon> ${order.pickupTime}</span>` : ''}
                                <span class="order-time">${date}</span>
                            </div>
                        </div>
                        <div class="order-items">
                            ${order.items.map(item => `
                                <div class="order-item-row" style="flex-direction: column; align-items: flex-start;">
                                    <div style="display: flex; justify-content: space-between; width: 100%;">
                                        <span>${item.qty}x ${item.name}</span>
                                        <span>${(item.price * item.qty).toFixed(2)}€</span>
                                    </div>
                                    ${item.note ? `<div style="font-size: 0.8rem; color: var(--color-accent); font-style: italic; margin-top: 2px;">Note: ${item.note}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                        <div class="order-footer">
                            <div class="order-total" onclick="editOrderTotal('${order.id}')" style="cursor: pointer;" title="Modifier le total">
                                Total: ${order.total.toFixed(2)}€ <ion-icon name="pencil-outline" style="font-size: 0.8rem; vertical-align: middle;"></ion-icon>
                            </div>
                            <div class="order-actions">
                                ${order.status === 'En attente'
                ? `<button class="btn-ready" onclick="updateOrderStatus('${order.id}', 'Prêt')">Prêt</button>`
                : `<span class="status-badge">Prêt</span>`
            }
                                <button class="btn-delete" onclick="deleteOrder('${order.id}')" title="Supprimer"><ion-icon name="trash-outline"></ion-icon></button>
                            </div>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

function createNewOrder() {
    const nextId = getNextOrderId();
    const order = {
        id: nextId,
        date: new Date().toISOString(),
        items: [{ id: 'manual', name: 'Commande Manuelle', price: 5.00, qty: 1 }],
        total: 5.00,
        status: 'En attente'
    };

    const orders = JSON.parse(localStorage.getItem('cafeOrders') || '[]');
    orders.unshift(order);
    localStorage.setItem('cafeOrders', JSON.stringify(orders));
    renderOrders();
    alert('Commande manuelle créée avec succès !');
}

function updateOrderStatus(id, newStatus) {
    const orders = JSON.parse(localStorage.getItem('cafeOrders') || '[]');
    const order = orders.find(o => o.id === id);
    if (order) {
        order.status = newStatus;
        localStorage.setItem('cafeOrders', JSON.stringify(orders));
        renderOrders();
        logActivity(`Commande ${id} marquée comme: ${newStatus}`);
    }
}

function deleteOrder(id) {
    if (confirm('Supprimer cette commande ?')) {
        let orders = JSON.parse(localStorage.getItem('cafeOrders') || '[]');
        orders = orders.filter(o => o.id !== id);
        localStorage.setItem('cafeOrders', JSON.stringify(orders));
        renderOrders();
    }
}

function editOrderTotal(id) {
    const orders = JSON.parse(localStorage.getItem('cafeOrders') || '[]');
    const order = orders.find(o => o.id === id);
    if (!order) return;

    const newTotalStr = prompt("Nouveau total pour la commande " + id + " (€) :", order.total.toFixed(2));
    const newTotal = parseFloat(newTotalStr);

    if (isNaN(newTotal)) {
        alert("Montant invalide");
        return;
    }

    order.total = newTotal;
    localStorage.setItem('cafeOrders', JSON.stringify(orders));
    renderOrders();
}


function loadBroadcast() {
    const currentMsg = localStorage.getItem('cafeBroadcast');
    const input = document.getElementById('broadcast-input');
    const status = document.getElementById('broadcast-status');

    if (currentMsg) {
        input.value = currentMsg;
        status.style.display = 'block';
    } else {
        status.style.display = 'none';
    }
}

function updateBroadcast() {
    const input = document.getElementById('broadcast-input');
    const msg = input.value.trim();
    if (msg) {
        localStorage.setItem('cafeBroadcast', msg);
        loadBroadcast();
        logActivity(`Message broadcast mis à jour: "${msg}"`);
        alert('Message publié !');
    }
}

function clearBroadcast() {
    localStorage.removeItem('cafeBroadcast');
    document.getElementById('broadcast-input').value = '';
    loadBroadcast();
    logActivity(`Message broadcast supprimé`);
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    const tabs = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active class from all
            navItems.forEach(nav => nav.classList.remove('active'));
            tabs.forEach(tab => tab.classList.remove('active'));

            // Add active class to clicked
            item.classList.add('active');

            const tabId = item.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');

            // Update Title
            pageTitle.textContent = item.querySelector('span').textContent;

            if (tabId === 'orders') renderOrders();
            if (tabId === 'analytics') renderAnalytics();
        });
    });
}

function renderActivityLog() {
    const list = document.querySelector('.activity-list');
    if (!list) return;

    const orders = JSON.parse(localStorage.getItem('cafeOrders') || '[]');
    const systemLogs = JSON.parse(localStorage.getItem('cafeSystemLogs') || '[]');

    // Combine and sort
    const activities = [
        ...orders.map(o => ({
            time: new Date(o.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            text: `Nouvelle commande (${o.id}): ${o.items.map(i => `${i.qty}x ${i.name}`).join(', ')}`,
            timestamp: new Date(o.date).getTime()
        })),
        ...systemLogs.map(l => ({
            ...l,
            time: new Date(l.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }))
    ];

    activities.sort((a, b) => b.timestamp - a.timestamp);

    // Limit to latest 10
    const latest = activities.slice(0, 10);

    if (latest.length === 0) {
        list.innerHTML = '<li class="activity-item"><span class="activity-text" style="color: var(--color-text-muted);">Aucune activité récente.</span></li>';
        return;
    }

    list.innerHTML = latest.map(act => `
        <li class="activity-item">
            <span class="activity-time">${act.time}</span>
            <span class="activity-text">${act.text}</span>
        </li>
    `).join('');
}

function logActivity(text) {
    const logs = JSON.parse(localStorage.getItem('cafeSystemLogs') || '[]');
    logs.unshift({
        text: text,
        timestamp: Date.now()
    });
    // Keep only last 50
    localStorage.setItem('cafeSystemLogs', JSON.stringify(logs.slice(0, 50)));
    renderActivityLog();
}

function renderMenuEditor() {
    const container = document.getElementById('dashboard-menu-grid');
    if (!container) return;

    if (typeof menuData === 'undefined') {
        console.error("Menu data not found");
        return;
    }

    // Sort categories based on saved order if exists
    const savedOrder = JSON.parse(localStorage.getItem('dashboard-menu-order'));
    if (savedOrder) {
        menuData.categories.sort((a, b) => savedOrder.indexOf(a.id) - savedOrder.indexOf(b.id));
    }

    container.innerHTML = menuData.categories.map(category => `
        <article class="editor-card" data-category-id="${category.id}">
            <div class="editor-card-header">
                <h3 class="editor-card-title">${category.label}</h3>
                <div class="header-actions">
                    <button class="action-btn" onclick="addMenuItem('${category.id}')" title="Ajouter un article">
                        <ion-icon name="add-circle-outline"></ion-icon>
                    </button>
                    <button class="action-btn" onclick="deleteCategory('${category.id}')" style="color: #E74C3C;" title="Supprimer la catégorie">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                </div>
            </div>
            <ul class="editor-list">
                ${category.items.map(item => `
                    <li class="editor-item">
                        <span class="editor-item-info">${item.name}</span>
                        <div class="editor-item-actions">
                            <span style="margin-right:8px; font-weight:600;">${item.price.toFixed(2)}€</span>
                            <button class="action-btn" onclick="editMenuItem('${category.id}', '${item.id}')" title="Modifier">
                                <ion-icon name="pencil-outline"></ion-icon>
                            </button>
                            <button class="action-btn" onclick="deleteMenuItem('${category.id}', '${item.id}')" style="color: #E74C3C;" title="Supprimer">
                                <ion-icon name="trash-outline"></ion-icon>
                            </button>
                        </div>
                    </li>
                `).join('')}
            </ul>
        </article>
    `).join('');

    initMenuSortable();
}

function addCategory() {
    const label = prompt("Nom de la nouvelle catégorie (ex: Pâtisseries) :");
    if (!label) return;

    const newCategory = {
        id: 'cat-' + Date.now(),
        label: label,
        items: []
    };

    menuData.categories.push(newCategory);
    saveMenuData(menuData);
    renderMenuEditor();
}

function deleteCategory(id) {
    if (confirm('Supprimer toute cette catégorie et ses articles ?')) {
        menuData.categories = menuData.categories.filter(c => c.id !== id);
        saveMenuData(menuData);
        renderMenuEditor();
    }
}

function saveMenuData(data) {
    localStorage.setItem('cafeMenuData', JSON.stringify(data));
    // Overwrite the global menuData to keep other parts of the app synced
    window.menuData = data;
    // Dispatch storage event to notify other tabs (like the client menu)
    window.dispatchEvent(new Event('storage'));
}

function addMenuItem(categoryId) {
    const name = prompt("Nom de l'article :");
    if (!name) return;

    const priceStr = prompt("Prix (€) :", "0.00");
    const price = parseFloat(priceStr);

    if (isNaN(price)) {
        alert("Prix invalide");
        return;
    }

    const category = menuData.categories.find(c => c.id === categoryId);
    if (category) {
        const newItem = {
            id: 'item-' + Date.now(),
            name: name,
            price: price
        };
        category.items.push(newItem);
        saveMenuData(menuData);
        renderMenuEditor();
        alert("Article ajouté !");
    }
}

function editMenuItem(categoryId, itemId) {
    const category = menuData.categories.find(c => c.id === categoryId);
    const item = category?.items.find(i => i.id === itemId);

    if (!item) return;

    const newName = prompt("Nouveau nom :", item.name);
    if (!newName) return;

    const newPriceStr = prompt("Nouveau prix (€) :", item.price.toFixed(2));
    const newPrice = parseFloat(newPriceStr);

    if (isNaN(newPrice)) {
        alert("Prix invalide");
        return;
    }

    item.name = newName;
    item.price = newPrice;

    saveMenuData(menuData);
    renderMenuEditor();
    alert("Article mis à jour !");
}

function deleteMenuItem(categoryId, itemId) {
    if (confirm('Supprimer cet article ?')) {
        const category = menuData.categories.find(c => c.id === categoryId);
        if (category) {
            category.items = category.items.filter(i => i.id !== itemId);
            saveMenuData(menuData);
            renderMenuEditor();
        }
    }
}

function initServiceStatus() {
    const isPaused = localStorage.getItem('cafeServicePaused') === 'true';
    updateServiceStatusUI(isPaused);
}

function toggleService() {
    const isPaused = localStorage.getItem('cafeServicePaused') === 'true';
    const nextState = !isPaused;
    localStorage.setItem('cafeServicePaused', nextState);
    updateServiceStatusUI(nextState);

    logActivity(`Service ${nextState ? 'mis en PAUSE' : 'RELANCÉ'}`);

    // Notify other tabs
    window.dispatchEvent(new Event('storage'));
}

function updateServiceStatusUI(isPaused) {
    const text = document.getElementById('service-status-text');
    const btn = document.getElementById('toggle-service-btn');
    if (!text || !btn) return;

    if (isPaused) {
        text.textContent = 'Le service est actuellement PAUSÉ';
        text.style.color = '#E74C3C';
        btn.innerHTML = '<ion-icon name="play-circle-outline"></ion-icon> Relancer le service';
        btn.style.background = '#8A9A5B'; // Green to resume
    } else {
        text.textContent = 'Le service est actuellement OUVERT';
        text.style.color = '#8A9A5B';
        btn.innerHTML = '<ion-icon name="pause-circle-outline"></ion-icon> Pauser le service';
        btn.style.background = '#E74C3C'; // Red to pause
    }
}

function getNextOrderId() {
    const today = new Date().toLocaleDateString('fr-FR');
    const lastDate = localStorage.getItem('cafeLastOrderDate');
    let counter = parseInt(localStorage.getItem('cafeOrderCounter') || '0');

    if (lastDate !== today) {
        counter = 1;
        localStorage.setItem('cafeLastOrderDate', today);
    } else {
        counter++;
    }

    localStorage.setItem('cafeOrderCounter', counter);
    return `#${counter}`;
}
function renderAnalytics() {
    renderAnalyticsFlux();
    renderAnalyticsProducts();
}

function renderAnalyticsFlux() {
    const ctx = document.getElementById('fluxChart');
    if (!ctx) return;

    const today = new Date().toLocaleDateString('fr-FR');
    const visits = JSON.parse(localStorage.getItem('cafeVisitStats') || '{}');
    const todayVisits = visits[today] || {};

    // Preparation des données pour les 24h
    const labels = Array.from({ length: 24 }, (_, i) => `${i}h`);
    const dataPoints = Array.from({ length: 24 }, (_, i) => {
        const h = i.toString().padStart(2, '0');
        return todayVisits[h] || 0;
    });

    if (fluxChartInstance) {
        fluxChartInstance.destroy();
    }

    fluxChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Visites',
                data: dataPoints,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#4CAF50',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1A1A1A',
                    padding: 12,
                    titleFont: { family: 'Plus Jakarta Sans', size: 14 },
                    bodyFont: { family: 'Plus Jakarta Sans', size: 13 },
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderAnalyticsProducts() {
    const container = document.getElementById('analytics-products-container');
    if (!container) return;

    const orders = JSON.parse(localStorage.getItem('cafeOrders') || '[]');
    const productStats = {};

    orders.forEach(order => {
        order.items.forEach(item => {
            productStats[item.name] = (productStats[item.name] || 0) + item.qty;
        });
    });

    const products = Object.entries(productStats).sort((a, b) => b[1] - a[1]).slice(0, 10);

    if (products.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted); padding-top: 40px;">Aucune commande pour le moment.</p>';
        return;
    }

    const maxVal = Math.max(...Object.values(productStats));

    container.innerHTML = products.map(([name, qty]) => {
        const width = (qty / maxVal) * 100;
        return `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.9rem;">
                    <span>${name}</span>
                    <span><strong>${qty}</strong> vendu(s)</span>
                </div>
                <div style="height: 10px; background: #eee; border-radius: 5px; overflow: hidden;">
                    <div style="height: 100%; width: ${width}%; background: #FF9800; border-radius: 5px; transition: width 0.8s ease;"></div>
                </div>
            </div>
        `;
    }).join('');
}
