// distributors.js — Distributor Management Logic
// NOTE: Auth guard is handled by auth.js which is loaded before this script.

var FALLBACK_DISTRIBUTORS = [
    { id: 1, name: 'SAIL Steel Mumbai', contact: '9876543210', location: 'Mumbai', status: 'Active' },
    { id: 2, name: 'Delhi Steel Corp', contact: '9123456780', location: 'Delhi', status: 'Active' },
    { id: 3, name: 'Bangalore Steel Ltd', contact: '9988776655', location: 'Bangalore', status: 'Inactive' },
    { id: 4, name: 'Kolkata Distribution Hub', contact: '9456123789', location: 'Kolkata', status: 'Active' }
];

var distributors = FALLBACK_DISTRIBUTORS.slice();
var nextId = 5;
var currentView = 'table';
var API_BASE_URL = 'http://127.0.0.1:5000';

function showBanner(connected) {
    var old = document.getElementById('backendBanner');
    if (old) old.remove();

    var banner = document.createElement('div');
    banner.id = 'backendBanner';
    banner.style.cssText = [
        'position:fixed;top:0;left:0;right:0;z-index:9999',
        'padding:10px 16px;font-size:14px;text-align:center',
        'font-weight:600;transition:opacity 0.4s ease'
    ].join(';');

    if (connected) {
        banner.style.background = '#d1fae5';
        banner.style.color = '#065f46';
        banner.textContent = '✅ Connected to Flask backend (http://127.0.0.1:5000)';
    } else {
        banner.style.background = '#fef3c7';
        banner.style.color = '#92400e';
        banner.textContent = '⚠️ Backend offline — showing local data. Run: python app.py';
    }

    document.body.prepend(banner);
    setTimeout(function () { banner.style.opacity = '0'; }, 4200);
    setTimeout(function () { banner.remove(); }, 4800);
}

function loadDistributorsFromAPI() {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 3000);

    fetch(API_BASE_URL + '/api/distributors', { signal: controller.signal })
        .then(function (res) {
            clearTimeout(timer);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(function (data) {
            if (Array.isArray(data) && data.length) {
                distributors = data.map(function (d) {
                    return {
                        id: d.id,
                        name: d.name,
                        contact: d.contact,
                        location: d.location,
                        status: d.status
                    };
                });
                nextId = Math.max.apply(null, distributors.map(function (d) { return d.id; })) + 1;
                showBanner(true);
            }
            renderDistributors();
        })
        .catch(function (err) {
            clearTimeout(timer);
            console.warn('Backend not reachable:', err.message);
            showBanner(false);
            renderDistributors();
        });
}

function renderDistributors() {
    var term = document.getElementById('searchInput').value.toLowerCase();
    var status = document.getElementById('statusFilter').value;

    var filtered = distributors.filter(function (d) {
        var matchName = d.name.toLowerCase().includes(term);
        var matchLoc = d.location.toLowerCase().includes(term);
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
    var tbody = document.getElementById('distributorTableBody');
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">No distributors found.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(function (d, idx) {
        return '<tr>' +
            '<td style="font-weight:600;color:#475569;">' + (idx + 1) + '</td>' +
            '<td><strong>' + esc(d.name) + '</strong></td>' +
            '<td>' + esc(d.contact) + '</td>' +
            '<td>📍 ' + esc(d.location) + '</td>' +
            '<td>' +
                '<label class="switch">' +
                  '<input type="checkbox" ' + (d.status === 'Active' ? 'checked' : '') + ' onchange="toggleStatus(' + d.id + ')">' +
                  '<span class="slider round"></span>' +
                '</label> ' +
                '<span class="status-text ' + (d.status === 'Active' ? 'status-active' : 'status-inactive') + '">' + d.status + '</span>' +
            '</td>' +
            '<td class="action-buttons">' +
              '<button onclick="editDistributor(' + d.id + ')" title="Edit">✏️</button>' +
              '<button onclick="deleteDistributor(' + d.id + ')" title="Delete">🗑️</button>' +
              '<button onclick="viewDetails(' + d.id + ')" title="View">👁️</button>' +
            '</td>' +
        '</tr>';
    }).join('');
}

function renderCards(list) {
    var container = document.getElementById('cardView');
    if (!list.length) {
        container.innerHTML = '<p style="padding:30px;color:#94a3b8;">No distributors found.</p>';
        return;
    }

    container.innerHTML = list.map(function (d) {
        return '<div class="dealer-card">' +
            '<div class="card-header">' +
              '<div class="dealer-avatar" style="font-size:40px;">🏢</div>' +
              '<div class="dealer-status-badge ' + (d.status === 'Active' ? 'badge-active' : 'badge-inactive') + '">' + d.status + '</div>' +
            '</div>' +
            '<div class="card-body">' +
              '<h3>' + esc(d.name) + '</h3>' +
              '<p>' + esc(d.contact) + '</p>' +
              '<p>📍 ' + esc(d.location) + '</p>' +
            '</div>' +
            '<div class="card-footer">' +
              '<button onclick="editDistributor(' + d.id + ')" class="card-btn edit-btn">✏️ Edit</button>' +
              '<button onclick="viewDetails(' + d.id + ')" class="card-btn view-btn-card">👁️ View</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function updateStats(list) {
    document.getElementById('totalDistributors').textContent = list.length;
    document.getElementById('activeDistributors').textContent = list.filter(function (d) { return d.status === 'Active'; }).length;
    var top = list.reduce(function (max, d) {
        return d.name && (!max || d.status === 'Active' && max.status !== 'Active') ? d : max;
    }, null);
    document.getElementById('topDistributor').textContent = top ? top.name : '-';
}

function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function toggleStatus(id) {
    var d = distributors.find(function (x) { return x.id === id; });
    if (d) { d.status = d.status === 'Active' ? 'Inactive' : 'Active'; }
    renderDistributors();
}

function editDistributor(id) {
    var d = distributors.find(function (x) { return x.id === id; });
    if (!d) return;
    document.getElementById('modalTitle').textContent = 'Edit Distributor';
    document.getElementById('distributorId').value = d.id;
    document.getElementById('distributorName').value = d.name;
    document.getElementById('distributorContact').value = d.contact;
    document.getElementById('distributorLocation').value = d.location;
    document.getElementById('distributorStatus').value = d.status;
    openModal();
}

function deleteDistributor(id) {
    if (!confirm('Delete this distributor? This cannot be undone.')) return;
    distributors = distributors.filter(function (d) { return d.id !== id; });
    renderDistributors();
}

function viewDetails(id) {
    var d = distributors.find(function (x) { return x.id === id; });
    if (!d) return;
    alert('Distributor Details\n\nName:     ' + d.name + '\nContact:  ' + d.contact + '\nLocation: ' + d.location + '\nStatus:   ' + d.status);
}

function exportToCSV() {
    var rows = 'Name,Contact,Location,Status\n';
    distributors.forEach(function (d) {
        rows += '"' + d.name.replace(/"/g,'""') + '","' + d.contact.replace(/"/g,'""') + '","' + d.location.replace(/"/g,'""') + '","' + d.status + '"\n';
    });
    var blob = new Blob([rows], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'distributors_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function openModal() {
    document.getElementById('distributorModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('distributorModal').style.display = 'none';
    document.getElementById('distributorForm').reset();
    document.getElementById('distributorId').value = '';
}

document.getElementById('distributorForm').addEventListener('submit', function (e) {
    e.preventDefault();

    var id = document.getElementById('distributorId').value;
    var name = document.getElementById('distributorName').value.trim();
    var contact = document.getElementById('distributorContact').value.trim();
    var location = document.getElementById('distributorLocation').value.trim();
    var status = document.getElementById('distributorStatus').value;

    if (id) {
        var idx = distributors.findIndex(function (d) { return d.id === parseInt(id, 10); });
        if (idx !== -1) distributors[idx] = { id: parseInt(id, 10), name: name, contact: contact, location: location, status: status };
    } else {
        distributors.push({ id: nextId++, name: name, contact: contact, location: location, status: status });
    }

    closeModal();
    renderDistributors();
});

document.getElementById('searchInput').addEventListener('input', renderDistributors);
document.getElementById('statusFilter').addEventListener('change', renderDistributors);

document.getElementById('addDistributorBtn').addEventListener('click', function () {
    document.getElementById('modalTitle').textContent = 'Add New Distributor';
    closeModal();
    openModal();
});

document.getElementById('tableViewBtn').addEventListener('click', function () {
    currentView = 'table';
    document.getElementById('tableView').style.display = 'block';
    document.getElementById('cardView').style.display = 'none';
    document.getElementById('tableViewBtn').classList.add('active');
    document.getElementById('cardViewBtn').classList.remove('active');
    renderDistributors();
});

document.getElementById('cardViewBtn').addEventListener('click', function () {
    currentView = 'card';
    document.getElementById('tableView').style.display = 'none';
    document.getElementById('cardView').style.display = 'grid';
    document.getElementById('cardViewBtn').classList.add('active');
    document.getElementById('tableViewBtn').classList.remove('active');
    renderDistributors();
});

document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('exportBtn').addEventListener('click', exportToCSV);

document.getElementById('distributorModal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
});

loadDistributorsFromAPI();
