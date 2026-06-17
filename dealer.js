// dealer.js
// Auth is handled by auth.js (loaded in <head> before this file)

var dealers     = [];
var nextId      = 100;
var currentView = 'table';
var API_URL     = 'http://127.0.0.1:5000/api/dealers';

// ─── Fallback data (8 dealers) used when backend is offline ──────────────────
var FALLBACK = [
  { id:1,  name:'Rajesh Steel Works',   location:'Mumbai',    sales:180000, status:'Active'   },
  { id:2,  name:'Sharma Traders',       location:'Delhi',     sales:145000, status:'Active'   },
  { id:3,  name:'Karnataka Steel Co',   location:'Bangalore', sales:92000,  status:'Active'   },
  { id:4,  name:'Jharkhand Metals',     location:'Jharkhand', sales:120000, status:'Active'   },
  { id:5,  name:'Kolkata Steel Hub',    location:'Kolkata',   sales:75000,  status:'Inactive' },
  { id:6,  name:'Chennai Iron & Steel', location:'Chennai',   sales:160000, status:'Active'   },
  { id:7,  name:'Pune Metal Works',     location:'Pune',      sales:88000,  status:'Active'   },
  { id:8,  name:'Hyderabad Steel Mart', location:'Hyderabad', sales:110000, status:'Active'   },
  { id:9,  name:'Ahmedabad Steels',     location:'Ahmedabad', sales:95000,  status:'Inactive' },
  { id:10, name:'Lucknow Metals',       location:'Lucknow',   sales:67000,  status:'Active'   }
];

// ─── API calls ────────────────────────────────────────────────────────────────
function apiLoad() {
  var ctrl  = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, 4000);

  fetch(API_URL, { signal: ctrl.signal })
    .then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      dealers = Array.isArray(data) && data.length ? data : FALLBACK;
      nextId  = Math.max.apply(null, dealers.map(function (d) { return d.id; })) + 1;
      showBanner(true);
      render();
    })
    .catch(function () {
      clearTimeout(timer);
      dealers = FALLBACK.slice();
      showBanner(false);
      render();
    });
}

function apiAdd(obj, done) {
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  })
  .then(function (r) { return r.json(); })
  .then(function (res) { done(res.id || nextId++); })
  .catch(function ()  { done(nextId++); });
}

function apiUpdate(id, obj) {
  fetch(API_URL + '/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  }).catch(function (e) { console.warn('PUT failed:', e.message); });
}

function apiDelete(id) {
  fetch(API_URL + '/' + id, { method: 'DELETE' })
    .catch(function (e) { console.warn('DELETE failed:', e.message); });
}

// ─── Status banner ────────────────────────────────────────────────────────────
function showBanner(connected) {
  var old = document.getElementById('_sailBanner');
  if (old) old.remove();
  var b = document.createElement('div');
  b.id = '_sailBanner';
  b.style.cssText = [
    'position:fixed;top:0;left:0;right:0;z-index:9999',
    'padding:9px 16px;text-align:center;font-size:13px;font-weight:600',
    'transition:opacity .6s'
  ].join(';');
  if (connected) {
    b.style.background = '#d1fae5'; b.style.color = '#065f46';
    b.textContent = '✅ Connected to Flask — dealer data loaded from database';
  } else {
    b.style.background = '#fef3c7'; b.style.color = '#92400e';
    b.textContent = '⚠️ Backend offline — showing local data. Run: python app.py';
  }
  document.body.prepend(b);
  setTimeout(function () { b.style.opacity = '0'; }, 4500);
  setTimeout(function () { if (b.parentNode) b.remove(); }, 5200);
}

// ─── Filtering ────────────────────────────────────────────────────────────────
function getFiltered() {
  var term   = document.getElementById('searchInput').value.toLowerCase();
  var status = document.getElementById('statusFilter').value;
  return dealers.filter(function (d) {
    var matchSearch = d.name.toLowerCase().includes(term) || d.location.toLowerCase().includes(term);
    var matchStatus = status === 'all' || d.status === status;
    return matchSearch && matchStatus;
  });
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  var list = getFiltered();
  updateStats(list);
  if (currentView === 'table') renderTable(list);
  else renderCards(list);
}

function renderTable(list) {
  var tbody = document.getElementById('dealerTableBody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#94a3b8;">No dealers found.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function (d) {
    return '<tr>'
      + '<td><strong>' + esc(d.name) + '</strong></td>'
      + '<td>📍 ' + esc(d.location) + '</td>'
      + '<td>₹ ' + Number(d.sales).toLocaleString() + '</td>'
      + '<td>'
      +   '<label class="switch">'
      +     '<input type="checkbox"' + (d.status === 'Active' ? ' checked' : '')
      +     ' onchange="toggleStatus(' + d.id + ')">'
      +     '<span class="slider round"></span>'
      +   '</label>'
      +   '<span class="status-text ' + (d.status === 'Active' ? 'status-active' : 'status-inactive') + '">'
      +     d.status
      +   '</span>'
      + '</td>'
      + '<td class="action-buttons">'
      +   '<button onclick="editDealer(' + d.id + ')"   title="Edit">✏️</button>'
      +   '<button onclick="deleteDealer(' + d.id + ')" title="Delete">🗑️</button>'
      +   '<button onclick="viewDetails(' + d.id + ')"  title="View">👁️</button>'
      + '</td>'
      + '</tr>';
  }).join('');
}

function renderCards(list) {
  var container = document.getElementById('dealerCardContainer');
  if (!list.length) {
    container.innerHTML = '<p style="padding:24px;color:#94a3b8;">No dealers found.</p>';
    return;
  }
  container.innerHTML = list.map(function (d) {
    return '<div class="dealer-card">'
      + '<div class="card-header">'
      +   '<span style="font-size:38px;">👤</span>'
      +   '<span class="dealer-status-badge ' + (d.status === 'Active' ? 'badge-active' : 'badge-inactive') + '">'
      +     d.status
      +   '</span>'
      + '</div>'
      + '<div class="card-body">'
      +   '<h3>' + esc(d.name) + '</h3>'
      +   '<p>📍 ' + esc(d.location) + '</p>'
      +   '<p class="sales-amount">₹ ' + Number(d.sales).toLocaleString() + '</p>'
      + '</div>'
      + '<div class="card-footer">'
      +   '<button onclick="editDealer(' + d.id + ')"   class="card-btn edit-btn">✏️ Edit</button>'
      +   '<button onclick="viewDetails(' + d.id + ')"  class="card-btn view-btn-card">👁️ View</button>'
      + '</div>'
      + '</div>';
  }).join('');
}

function updateStats(list) {
  document.getElementById('totalDealers').textContent  = list.length;
  document.getElementById('activeDealers').textContent = list.filter(function (d) { return d.status === 'Active'; }).length;
  var total = list.reduce(function (s, d) { return s + Number(d.sales); }, 0);
  document.getElementById('totalSales').textContent    = '₹' + total.toLocaleString();
  var top = list.length ? list.reduce(function (m, d) { return Number(d.sales) > Number(m.sales) ? d : m; }) : null;
  document.getElementById('topPerformer').textContent  = top ? top.name : '-';
}

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Actions ──────────────────────────────────────────────────────────────────
function toggleStatus(id) {
  var d = dealers.find(function (x) { return x.id === id; });
  if (!d) return;
  d.status = d.status === 'Active' ? 'Inactive' : 'Active';
  apiUpdate(id, d);
  render();
}

function editDealer(id) {
  var d = dealers.find(function (x) { return x.id === id; });
  if (!d) return;
  document.getElementById('modalTitle').textContent = 'Edit Dealer';
  document.getElementById('dealerId').value         = d.id;
  document.getElementById('dealerName').value       = d.name;
  document.getElementById('dealerLocation').value   = d.location;
  document.getElementById('dealerSales').value      = d.sales;
  document.getElementById('dealerStatus').value     = d.status;
  openModal();
}

function deleteDealer(id) {
  if (!confirm('Delete this dealer? This cannot be undone.')) return;
  apiDelete(id);
  dealers = dealers.filter(function (d) { return d.id !== id; });
  render();
}

function viewDetails(id) {
  var d = dealers.find(function (x) { return x.id === id; });
  if (!d) return;
  alert(
    'Dealer Details\n\n'
    + 'Name:     ' + d.name + '\n'
    + 'Location: ' + d.location + '\n'
    + 'Sales:    ₹' + Number(d.sales).toLocaleString() + '\n'
    + 'Status:   ' + d.status
  );
}

function exportToCSV() {
  var csv = 'Name,Location,Sales,Status\n'
    + dealers.map(function (d) {
        return '"' + d.name + '","' + d.location + '",' + d.sales + ',"' + d.status + '"';
      }).join('\n');
  var a  = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'dealers.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal() {
  document.getElementById('dealerModal').style.display = 'flex';
}
function closeModal() {
  document.getElementById('dealerModal').style.display = 'none';
  document.getElementById('dealerForm').reset();
  document.getElementById('dealerId').value = '';
}

// ─── AI Insight box ───────────────────────────────────────────────────────────
function initAIBox() {
  var anchor = document.getElementById('aiDealerAnchor');
  if (!anchor || typeof getSalesInsight === 'undefined') return;

  var box = document.createElement('div');
  box.style.cssText = [
    'background:white;border-radius:15px;padding:20px 24px',
    'margin-bottom:20px;box-shadow:0 2px 10px rgba(0,0,0,0.08)',
    'border-left:4px solid #667eea'
  ].join(';');
  box.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;">'
    + '<h3 style="color:#1e293b;font-size:15px;">🤖 AI Sales Insights</h3>'
    + '<button id="dealerAIBtn" style="background:linear-gradient(135deg,#667eea,#764ba2);'
    +   'color:white;border:none;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">'
    +   '✨ Analyze with AI'
    + '</button>'
    + '</div>'
    + '<div id="dealerAIResult" style="margin-top:12px;color:#475569;font-size:14px;line-height:1.7;display:none;"></div>';
  anchor.appendChild(box);

  document.getElementById('dealerAIBtn').addEventListener('click', async function () {
    var btn    = this;
    var result = document.getElementById('dealerAIResult');
    btn.textContent   = '⏳ Analyzing...';
    btn.disabled      = true;
    result.style.display = 'block';
    result.innerHTML  = '<span style="color:#667eea;">AI is analyzing your dealer data...</span>';
    try {
      var text = await getSalesInsight('Dealer', dealers);
      result.innerHTML = text.split('\n').filter(function (l) { return l.trim(); }).map(function (l) {
        return (l.match(/^[-•*]/))
          ? '<div style="padding:4px 0 4px 14px;border-left:3px solid #667eea;margin:5px 0;">' + l.replace(/^[-•*]\s*/, '') + '</div>'
          : '<p style="margin:5px 0;">' + l + '</p>';
      }).join('');
      btn.textContent = '✨ Refresh';
    } catch (e) {
      result.innerHTML = '<span style="color:#ef4444;">⚠️ AI unavailable. Check your connection and try again.</span>';
      btn.textContent  = '✨ Retry';
    }
    btn.disabled = false;
  });
}

// ─── Boot — single DOMContentLoaded ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

  // Show role
  var role = localStorage.getItem('userRole');
  if (role) document.getElementById('profileLabel').textContent = role;

  // Form submit — Add or Edit
  document.getElementById('dealerForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id  = document.getElementById('dealerId').value;
    var obj = {
      name:     document.getElementById('dealerName').value.trim(),
      location: document.getElementById('dealerLocation').value.trim(),
      sales:    parseInt(document.getElementById('dealerSales').value, 10) || 0,
      status:   document.getElementById('dealerStatus').value
    };

    if (id) {
      // EDIT existing
      var numId = parseInt(id, 10);
      obj.id = numId;
      apiUpdate(numId, obj);
      var idx = dealers.findIndex(function (d) { return d.id === numId; });
      if (idx !== -1) dealers[idx] = obj;
      closeModal();
      render();
    } else {
      // ADD new — POST to backend, wait for real ID
      apiAdd(obj, function (newId) {
        obj.id = newId;
        dealers.push(obj);
        closeModal();
        render();
      });
    }
  });

  // Search & filter
  document.getElementById('searchInput').addEventListener('input',   render);
  document.getElementById('statusFilter').addEventListener('change', render);

  // Table / Card view toggle
  document.getElementById('tableViewBtn').addEventListener('click', function () {
    currentView = 'table';
    document.getElementById('tableView').style.display = 'block';
    document.getElementById('cardView').style.display  = 'none';
    document.getElementById('tableViewBtn').classList.add('active');
    document.getElementById('cardViewBtn').classList.remove('active');
    render();
  });
  document.getElementById('cardViewBtn').addEventListener('click', function () {
    currentView = 'card';
    document.getElementById('tableView').style.display = 'none';
    document.getElementById('cardView').style.display  = 'block';
    document.getElementById('cardViewBtn').classList.add('active');
    document.getElementById('tableViewBtn').classList.remove('active');
    render();
  });

  // Add Dealer button
  document.getElementById('addDealerBtn').addEventListener('click', function () {
    document.getElementById('modalTitle').textContent = 'Add New Dealer';
    closeModal();   // resets form
    openModal();
  });

  // Modal close buttons
  document.getElementById('closeModal').addEventListener('click',  closeModal);
  document.getElementById('cancelBtn').addEventListener('click',   closeModal);
  document.getElementById('dealerModal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  // Export CSV
  document.getElementById('exportBtn').addEventListener('click', exportToCSV);

  // AI box
  initAIBox();

  // Load dealers from backend (or fallback)
  apiLoad();
});