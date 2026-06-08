// dealer.js — Dealer Management Logic
// NOTE: Auth guard is handled by auth.js which is loaded before this script.

// ─── Data ─────────────────────────────────────────────────────────────────────
var FALLBACK_DEALERS = [
    { id: 1, name: 'Dealer A', location: 'Mumbai',    sales: 120000, status: 'Active'   },
    { id: 2, name: 'Dealer B', location: 'Delhi',     sales: 85000,  status: 'Active'   },
    { id: 3, name: 'Dealer C', location: 'Bangalore', sales: 60000,  status: 'Inactive' },
    { id: 4, name: 'Dealer D', location: 'Jharkhand', sales: 120000, status: 'Active'   }
];

var dealers = FALLBACK_DEALERS.slice(); // copy
var nextId  = 5;
var currentView = 'table';

// ─── Backend ──────────────────────────────────────────────────────────────────
var API_BASE_URL = 'http://127.0.0.1:5000';

function showBanner(connected) {
    var old = document.getElementById('backendBanner');
    if (old) old.remove();

    var banner = document.createElement('div');
    banner.id = 'backendBanner';
    banner.style.cssText = [
        'position:fixed;top:0;left:0;right:0;z-index:9999',
        'padding:9px 16px;font-size:13px;text-align:center',
        'transition:opacity 0.6s'
    ].join(';');

    if (connected) {
        banner.style.background = '#d1fae5';
        banner.style.color      = '#065f46';
        banner.textContent      = '✅ Connected to Flask backend (http://127.0.0.1:5000)';
    } else {
        banner.style.background = '#fef3c7';
        banner.style.color      = '#92400e';
        banner.textContent      = '⚠️ Backend offline — showing local data. Run: python app.py';
    }
    document.body.prepend(banner);
    setTimeout(function () { banner.style.opacity = '0'; }, 4500);
    setTimeout(function () { banner.remove(); },             5200);
}

function loadDealersFromAPI() {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 3000);

    fetch(API_BASE_URL + '/dealers', { signal: controller.signal })
        .then(function (res) {
            clearTimeout(timer);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(function (data) {
            if (Array.isArray(data) && data.length) {
                dealers = data.map(function (d) {
                    return { id: d.id, name: d.name, location: d.location, sales: d.sales, status: d.status };
                });
                nextId = Math.max.apply(null, dealers.map(function (d) { return d.id; })) + 1;
                showBanner(true);
            }
            renderDealers();
        })
        .catch(function (err) {
            clearTimeout(timer);
            console.warn('Backend not reachable:', err.message);
            showBanner(false);
            renderDealers();
        });
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderDealers() {
    var term   = document.getElementById('searchInput').value.toLowerCase();
    var status = document.getElementById('statusFilter').value;

    var filtered = dealers.filter(function (d) {
        var matchName   = d.name.toLowerCase().includes(term);
        var matchLoc    = d.location.toLowerCase().includes(term);
        var matchStatus = status === 'all' || d.status === status;
        return (matchName || matchLoc) && matchStatus;
    });

    updateStats(filtered);

    if (currentView === 'table') {
        renderTable(filtered);
    } else {
        renderCards(filtered);
    }
}

function renderTable(list) {
    var tbody = document.getElementById('dealerTableBody');
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#94a3b8;">No dealers found.</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(function (d) {
        return '<tr>' +
            '<td><strong>' + esc(d.name) + '</strong></td>' +
            '<td>📍 ' + esc(d.location) + '</td>' +
            '<td>₹ ' + d.sales.toLocaleString() + '</td>' +
            '<td>' +
              '<label class="switch">' +
                '<input type="checkbox" ' + (d.status === 'Active' ? 'checked' : '') + ' onchange="toggleStatus(' + d.id + ')">' +
                '<span class="slider round"></span>' +
              '</label>' +
              '<span class="status-text ' + (d.status === 'Active' ? 'status-active' : 'status-inactive') + '">' + d.status + '</span>' +
            '</td>' +
            '<td class="action-buttons">' +
              '<button class="action-edit"   onclick="editDealer('   + d.id + ')" title="Edit">✏️</button>' +
              '<button class="action-delete" onclick="deleteDealer(' + d.id + ')" title="Delete">🗑️</button>' +
              '<button class="action-view"   onclick="viewDetails('  + d.id + ')" title="View">👁️</button>' +
            '</td>' +
        '</tr>';
    }).join('');
}

function renderCards(list) {
    var container = document.getElementById('dealerCardContainer');
    if (!list.length) {
        container.innerHTML = '<p style="padding:30px;color:#94a3b8;">No dealers found.</p>';
        return;
    }
    container.innerHTML = list.map(function (d) {
        return '<div class="dealer-card">' +
            '<div class="card-header">' +
              '<div class="dealer-avatar" style="font-size:40px;">👤</div>' +
              '<div class="dealer-status-badge ' + (d.status === 'Active' ? 'badge-active' : 'badge-inactive') + '">' + d.status + '</div>' +
            '</div>' +
            '<div class="card-body">' +
              '<h3>' + esc(d.name) + '</h3>' +
              '<p>📍 ' + esc(d.location) + '</p>' +
              '<p class="sales-amount">₹ ' + d.sales.toLocaleString() + '</p>' +
            '</div>' +
            '<div class="card-footer">' +
              '<button onclick="editDealer('  + d.id + ')" class="card-btn edit-btn">✏️ Edit</button>' +
              '<button onclick="viewDetails(' + d.id + ')" class="card-btn view-btn-card">👁️ View</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function updateStats(list) {
    document.getElementById('totalDealers').textContent  = list.length;
    document.getElementById('activeDealers').textContent = list.filter(function (d) { return d.status === 'Active'; }).length;
    var total = list.reduce(function (s, d) { return s + d.sales; }, 0);
    document.getElementById('totalSales').textContent    = '₹' + total.toLocaleString();
    var top = list.reduce(function (max, d) { return d.sales > (max ? max.sales : -1) ? d : max; }, null);
    document.getElementById('topPerformer').textContent  = top ? top.name : '-';
}

// Escape HTML to prevent XSS
function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─── Actions ──────────────────────────────────────────────────────────────────
function toggleStatus(id) {
    var d = dealers.find(function (x) { return x.id === id; });
    if (d) { d.status = d.status === 'Active' ? 'Inactive' : 'Active'; }
    renderDealers();
}

function editDealer(id) {
    var d = dealers.find(function (x) { return x.id === id; });
    if (!d) return;
    document.getElementById('modalTitle').textContent   = 'Edit Dealer';
    document.getElementById('dealerId').value           = d.id;
    document.getElementById('dealerName').value         = d.name;
    document.getElementById('dealerLocation').value     = d.location;
    document.getElementById('dealerSales').value        = d.sales;
    document.getElementById('dealerStatus').value       = d.status;
    openModal();
}

function deleteDealer(id) {
    if (!confirm('Delete this dealer? This cannot be undone.')) return;
    dealers = dealers.filter(function (d) { return d.id !== id; });
    renderDealers();
}

function viewDetails(id) {
    var d = dealers.find(function (x) { return x.id === id; });
    if (!d) return;
    alert('Dealer Details\n\nName:     ' + d.name + '\nLocation: ' + d.location + '\nSales:    ₹' + d.sales.toLocaleString() + '\nStatus:   ' + d.status);
}

function exportToCSV() {
    var csv = 'Dealer Name,Location,Total Sales (Rs),Status\n';
    dealers.forEach(function (d) {
        csv += '"' + d.name + '","' + d.location + '",' + d.sales + ',"' + d.status + '"\n';
    });
    var blob = new Blob([csv], { type: 'text/csv' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = 'dealers_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── Modal helpers ────────────────────────────────────────────────────────────
function openModal() {
    document.getElementById('dealerModal').style.display = 'flex';
}
function closeModal() {
    document.getElementById('dealerModal').style.display = 'none';
    document.getElementById('dealerForm').reset();
    document.getElementById('dealerId').value = '';
}

// ─── Form submit ──────────────────────────────────────────────────────────────
document.getElementById('dealerForm').addEventListener('submit', function (e) {
    e.preventDefault();

    var id       = document.getElementById('dealerId').value;
    var name     = document.getElementById('dealerName').value.trim();
    var location = document.getElementById('dealerLocation').value.trim();
    var sales    = parseInt(document.getElementById('dealerSales').value, 10);
    var status   = document.getElementById('dealerStatus').value;

    if (id) {
        var idx = dealers.findIndex(function (d) { return d.id === parseInt(id, 10); });
        if (idx !== -1) dealers[idx] = { id: parseInt(id, 10), name: name, location: location, sales: sales, status: status };
    } else {
        dealers.push({ id: nextId++, name: name, location: location, sales: sales, status: status });
    }

    closeModal();
    renderDealers();
});

// ─── Event Listeners ──────────────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input',   renderDealers);
document.getElementById('statusFilter').addEventListener('change', renderDealers);

document.getElementById('addDealerBtn').addEventListener('click', function () {
    document.getElementById('modalTitle').textContent = 'Add New Dealer';
    closeModal();   // reset form
    openModal();
});

document.getElementById('tableViewBtn').addEventListener('click', function () {
    currentView = 'table';
    document.getElementById('tableView').style.display = 'block';
    document.getElementById('cardView').style.display  = 'none';
    document.getElementById('tableViewBtn').classList.add('active');
    document.getElementById('cardViewBtn').classList.remove('active');
    renderDealers();
});

document.getElementById('cardViewBtn').addEventListener('click', function () {
    currentView = 'card';
    document.getElementById('tableView').style.display = 'none';
    document.getElementById('cardView').style.display  = 'block';
    document.getElementById('cardViewBtn').classList.add('active');
    document.getElementById('tableViewBtn').classList.remove('active');
    renderDealers();
});

document.getElementById('closeModal').addEventListener('click',  closeModal);
document.getElementById('cancelBtn').addEventListener('click',   closeModal);
document.getElementById('exportBtn').addEventListener('click',   exportToCSV);

// Close modal when clicking the dark backdrop
document.getElementById('dealerModal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
loadDealersFromAPI();