// ─── Auth Guard ───────────────────────────────────────────────────────────────
// Only redirect if we're NOT on the login page and not logged in
(function checkAuth() {
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage !== 'form.html' && localStorage.getItem('loggedIn') !== 'true') {
        window.location.href = 'form.html';
    }
})();

// ─── Logout ───────────────────────────────────────────────────────────────────
function logout() {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('userRole');
    window.location.href = 'form.html';
}

// ─── Data ─────────────────────────────────────────────────────────────────────
// Fallback data used when the backend is not reachable
const FALLBACK_DEALERS = [
    { id: 1, name: "Dealer A",  location: "Mumbai",    sales: 120000, status: "Active"   },
    { id: 2, name: "Dealer B",  location: "Delhi",     sales: 85000,  status: "Active"   },
    { id: 3, name: "Dealer C",  location: "Bangalore", sales: 60000,  status: "Inactive" },
    { id: 4, name: "Dealer D",  location: "Jharkhand", sales: 120000, status: "Active"   }
];

let dealers = [...FALLBACK_DEALERS];
let nextId   = 5;

// ─── Backend Config ───────────────────────────────────────────────────────────
// Change this URL if your Flask server runs on a different host/port
const API_BASE_URL = 'http://127.0.0.1:5000';

// Banner element injected to show backend status
function showBackendBanner(connected) {
    let banner = document.getElementById('backendBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'backendBanner';
        banner.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
            padding: 8px 16px; font-size: 13px; text-align: center;
            transition: opacity 0.5s;
        `;
        document.body.prepend(banner);
    }
    if (connected) {
        banner.style.background = '#d1fae5';
        banner.style.color      = '#065f46';
        banner.textContent      = '✅ Connected to Flask backend (http://127.0.0.1:5000)';
    } else {
        banner.style.background = '#fef3c7';
        banner.style.color      = '#92400e';
        banner.textContent      = '⚠️ Backend not reachable — using local fallback data. Start Flask with: python app.py';
    }
    // Auto-hide after 5 seconds
    setTimeout(() => { banner.style.opacity = '0'; }, 5000);
    setTimeout(() => { banner.remove(); }, 5500);
}

async function loadDealersFromAPI() {
    try {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 3000); // 3 s timeout

        const response = await fetch(`${API_BASE_URL}/dealers`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const apiDealers = await response.json();

        if (Array.isArray(apiDealers) && apiDealers.length) {
            dealers = apiDealers.map(d => ({
                id:       d.id,
                name:     d.name,
                location: d.location,
                sales:    d.sales,
                status:   d.status
            }));
            nextId = Math.max(...dealers.map(d => d.id)) + 1;
            showBackendBanner(true);
        }
    } catch (error) {
        // AbortError = timeout; TypeError = network down; both fall back silently
        console.warn('Backend not reachable, using fallback data:', error.message);
        showBackendBanner(false);
    } finally {
        renderDealers();
    }
}

// ─── View State ───────────────────────────────────────────────────────────────
let currentView = 'table';

// ─── DOM References ───────────────────────────────────────────────────────────
const dealerTableBody     = document.getElementById('dealerTableBody');
const dealerCardContainer = document.getElementById('dealerCardContainer');
const searchInput         = document.getElementById('searchInput');
const statusFilter        = document.getElementById('statusFilter');
const tableViewBtn        = document.getElementById('tableViewBtn');
const cardViewBtn         = document.getElementById('cardViewBtn');
const modal               = document.getElementById('dealerModal');
const addDealerBtn        = document.getElementById('addDealerBtn');
const closeBtn            = document.querySelector('.close');
const cancelBtn           = document.getElementById('cancelBtn');
const dealerForm          = document.getElementById('dealerForm');
const exportBtn           = document.getElementById('exportBtn');

// ─── Render ───────────────────────────────────────────────────────────────────
function renderDealers() {
    const searchTerm  = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;

    const filtered = dealers.filter(d => {
        const matchSearch = d.name.toLowerCase().includes(searchTerm) ||
                            d.location.toLowerCase().includes(searchTerm);
        const matchStatus = statusValue === 'all' || d.status === statusValue;
        return matchSearch && matchStatus;
    });

    updateStatistics(filtered);

    if (currentView === 'table') {
        renderTableView(filtered);
    } else {
        renderCardView(filtered);
    }
}

function renderTableView(list) {
    dealerTableBody.innerHTML = list.map(d => `
        <tr>
            <td><strong>${d.name}</strong></td>
            <td>${d.location}</td>
            <td>₹ ${d.sales.toLocaleString()}</td>
            <td>
                <label class="switch">
                    <input type="checkbox" ${d.status === 'Active' ? 'checked' : ''}
                           onchange="toggleStatus(${d.id})">
                    <span class="slider round"></span>
                </label>
                <span class="status-text ${d.status === 'Active' ? 'status-active' : 'status-inactive'}">
                    ${d.status}
                </span>
            </td>
            <td class="action-buttons">
                <button class="action-edit"   onclick="editDealer(${d.id})"   title="Edit">✏️</button>
                <button class="action-delete" onclick="deleteDealer(${d.id})" title="Delete">🗑️</button>
                <button class="action-view"   onclick="viewDetails(${d.id})"  title="View">👁️</button>
            </td>
        </tr>
    `).join('');
}

function renderCardView(list) {
    dealerCardContainer.innerHTML = list.map(d => `
        <div class="dealer-card ${d.status === 'Active' ? 'card-active' : 'card-inactive'}">
            <div class="card-header">
                <div class="dealer-avatar">👤</div>
                <div class="dealer-status-badge ${d.status === 'Active' ? 'badge-active' : 'badge-inactive'}">
                    ${d.status}
                </div>
            </div>
            <div class="card-body">
                <h3>${d.name}</h3>
                <p>📍 ${d.location}</p>
                <p class="sales-amount">₹ ${d.sales.toLocaleString()}</p>
            </div>
            <div class="card-footer">
                <button onclick="editDealer(${d.id})"  class="card-btn edit-btn">✏️ Edit</button>
                <button onclick="viewDetails(${d.id})" class="card-btn view-btn-card">👁️ View</button>
            </div>
        </div>
    `).join('');
}

function updateStatistics(list) {
    document.getElementById('totalDealers').textContent  = list.length;
    document.getElementById('activeDealers').textContent = list.filter(d => d.status === 'Active').length;
    const total = list.reduce((s, d) => s + d.sales, 0);
    document.getElementById('totalSales').textContent    = `₹${total.toLocaleString()}`;
    const top = list.reduce((max, d) => d.sales > (max?.sales ?? -1) ? d : max, null);
    document.getElementById('topPerformer').textContent  = top ? top.name : '-';
}

// ─── Actions ──────────────────────────────────────────────────────────────────
function toggleStatus(id) {
    const d   = dealers.find(x => x.id === id);
    if (d) d.status = d.status === 'Active' ? 'Inactive' : 'Active';
    renderDealers();
}

function editDealer(id) {
    const d = dealers.find(x => x.id === id);
    if (!d) return;
    document.getElementById('modalTitle').textContent    = 'Edit Dealer';
    document.getElementById('dealerId').value            = d.id;
    document.getElementById('dealerName').value          = d.name;
    document.getElementById('dealerLocation').value      = d.location;
    document.getElementById('dealerSales').value         = d.sales;
    document.getElementById('dealerStatus').value        = d.status;
    modal.style.display = 'flex';
}

function deleteDealer(id) {
    if (confirm('Are you sure you want to delete this dealer?')) {
        dealers = dealers.filter(d => d.id !== id);
        renderDealers();
    }
}

function viewDetails(id) {
    const d = dealers.find(x => x.id === id);
    if (!d) return;
    alert(`📋 Dealer Details\n\nName:     ${d.name}\nLocation: ${d.location}\nSales:    ₹${d.sales.toLocaleString()}\nStatus:   ${d.status}`);
}

function exportToCSV() {
    let csv = 'Dealer Name,Location,Total Sales (₹),Status\n';
    dealers.forEach(d => {
        csv += `"${d.name}","${d.location}",${d.sales},"${d.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'dealers_data.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Form Submit (Add / Edit) ─────────────────────────────────────────────────
dealerForm.addEventListener('submit', e => {
    e.preventDefault();

    const id       = document.getElementById('dealerId').value;
    const name     = document.getElementById('dealerName').value.trim();
    const location = document.getElementById('dealerLocation').value.trim();
    const sales    = parseInt(document.getElementById('dealerSales').value, 10);
    const status   = document.getElementById('dealerStatus').value;

    if (id) {
        // Update existing dealer
        const idx = dealers.findIndex(d => d.id === parseInt(id, 10));
        if (idx !== -1) dealers[idx] = { ...dealers[idx], name, location, sales, status };
    } else {
        // Add new dealer
        dealers.push({ id: nextId++, name, location, sales, status });
    }

    modal.style.display = 'none';
    dealerForm.reset();
    document.getElementById('dealerId').value = '';
    renderDealers();
});

// ─── Event Listeners ──────────────────────────────────────────────────────────
searchInput.addEventListener('input',  renderDealers);
statusFilter.addEventListener('change', renderDealers);

tableViewBtn.addEventListener('click', () => {
    currentView = 'table';
    document.getElementById('tableView').style.display = 'block';
    document.getElementById('cardView').style.display  = 'none';
    tableViewBtn.classList.add('active');
    cardViewBtn.classList.remove('active');
    renderDealers();
});

cardViewBtn.addEventListener('click', () => {
    currentView = 'card';
    document.getElementById('tableView').style.display = 'none';
    document.getElementById('cardView').style.display  = 'block';
    cardViewBtn.classList.add('active');
    tableViewBtn.classList.remove('active');
    renderDealers();
});

addDealerBtn.onclick = () => {
    document.getElementById('modalTitle').textContent = 'Add New Dealer';
    dealerForm.reset();
    document.getElementById('dealerId').value = '';
    modal.style.display = 'flex';
};

closeBtn.onclick  = () => { modal.style.display = 'none'; };
cancelBtn.onclick = () => { modal.style.display = 'none'; };
window.onclick    = e  => { if (e.target === modal) modal.style.display = 'none'; };
exportBtn.onclick = exportToCSV;

// ─── Init ─────────────────────────────────────────────────────────────────────
loadDealersFromAPI();