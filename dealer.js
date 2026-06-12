// dealer.js
// auth.js already ran (loaded in <head>) — no need to repeat auth check here

var dealers = [
  { id:1, code:'D001', name:'Dealer A', contact:'Ravi Kumar', phone:'9876543210', email:'ravi@example.com', address:'Andheri West', pin:'400053', gstin:'27AAAAA0000A1Z5', location:'Mumbai',    established:'2015-06-12', sales:120000, status:'Active'   },
  { id:2, code:'D002', name:'Dealer B', contact:'Anita Sharma', phone:'9123456780', email:'anita@example.com', address:'Civil Lines', pin:'110054', gstin:'07BBBBB1111B2Z6', location:'Delhi',     established:'2018-03-20', sales:85000,  status:'Active'   },
  { id:3, code:'D003', name:'Dealer C', contact:'Mohit Singh', phone:'9988776655', email:'mohit@example.com', address:'Indiranagar', pin:'560038', gstin:'29CCCCC2222C3Z7', location:'Bangalore', established:'2012-11-01', sales:60000,  status:'Inactive' },
  { id:4, code:'D004', name:'Dealer D', contact:'Sonia Rao', phone:'9001122334', email:'sonia@example.com', address:'Ranchi Center', pin:'834001', gstin:'20DDDDD3333D4Z8', location:'Jharkhand', established:'2019-07-15', sales:120000, status:'Active'   }
];
var nextId = 5;
var currentView = 'table';
var API = (window.location.protocol.indexOf('http') === 0 ? window.location.origin : 'http://127.0.0.1:5000') + '/api';
var backendAvailable = false;

// ── Backend loader ────────────────────────────────────────────────────────────
function loadFromAPI() {
  var ctrl  = new AbortController();
  var timer = setTimeout(function(){ ctrl.abort(); }, 3000);

  fetch(API + '/dealers', { signal: ctrl.signal })
    .then(function(r){ clearTimeout(timer); if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(data){
      backendAvailable = true;
      showBanner(true);
      if (Array.isArray(data)) {
        dealers = data;
        nextId = data.length ? Math.max.apply(null, data.map(function(d){ return d.id || 0; })) + 1 : 1;
      }
      render();
    })
    .catch(function(){ clearTimeout(timer); showBanner(false); render(); });
}

function showBanner(ok) {
  var b = document.createElement('div');
  b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;padding:8px;text-align:center;font-size:13px;transition:opacity .5s';
  b.style.background = ok ? '#d1fae5' : '#fef3c7';
  b.style.color      = ok ? '#065f46' : '#92400e';
  b.textContent = ok
    ? '✅ Connected to Flask backend'
    : '⚠️ Backend offline — using local data. Start with: python app.py';
  document.body.prepend(b);
  setTimeout(function(){ b.style.opacity='0'; }, 4000);
  setTimeout(function(){ b.remove(); },          4600);
}

// ── Render ────────────────────────────────────────────────────────────────────
function filtered() {
  var term   = document.getElementById('searchInput').value.toLowerCase();
  var status = document.getElementById('statusFilter').value;
  return dealers.filter(function(d){
    var hay = [d.name, d.location, d.code, d.contact, d.email, d.phone].map(function(x){ return (x||'').toString().toLowerCase(); }).join(' ');
    return (hay.indexOf(term) !== -1) && (status === 'all' || d.status === status);
  });
}

function render() {
  var list = filtered();
  updateStats(list);
  currentView === 'table' ? renderTable(list) : renderCards(list);
}

function renderTable(list) {
  document.getElementById('dealerTableBody').innerHTML = list.length
    ? list.map(function(d){ return(
        '<tr>' +
        '<td>'+esc(d.code||'')+'</td>' +
        '<td><strong>'+esc(d.name)+'</strong></td>' +
        '<td>'+esc(d.contact||'')+'</td>' +
        '<td>'+esc(d.phone||'')+'</td>' +
        '<td>'+esc(d.email||'')+'</td>' +
        '<td>📍 '+esc(d.location||'')+'</td>' +
        '<td>₹ '+(Number(d.sales)||0).toLocaleString()+'</td>' +
        '<td>' +
          '<label class="switch"><input type="checkbox"'+(d.status==='Active'?' checked':'')+' onchange="toggleStatus('+d.id+')"><span class="slider round"></span></label>' +
          '<span class="status-text '+(d.status==='Active'?'status-active':'status-inactive')+'">'+d.status+'</span>' +
        '</td>' +
        '<td class="action-buttons">' +
          '<button onclick="editDealer('+d.id+')"   title="Edit">✏️</button>' +
          '<button onclick="deleteDealer('+d.id+')" title="Delete">🗑️</button>' +
          '<button onclick="viewDetails('+d.id+')"  title="View">👁️</button>' +
        '</td></tr>'
      ); }).join('')
    : '<tr><td colspan="9" style="text-align:center;padding:30px;color:#94a3b8;">No dealers found.</td></tr>';
}

function renderCards(list) {
  document.getElementById('dealerCardContainer').innerHTML = list.length
    ? list.map(function(d){ return(
        '<div class="dealer-card">' +
        '<div class="card-header">' +
          '<div style="display:flex;align-items:center;gap:12px;"><span style="font-size:34px;">👤</span><div><strong>'+esc(d.name)+'</strong><div style="font-size:12px;color:#64748b;">'+esc(d.code||'')+'</div></div></div>' +
          '<span class="dealer-status-badge '+(d.status==='Active'?'badge-active':'badge-inactive')+'">'+d.status+'</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<p>📍 '+esc(d.location||'')+'</p>' +
          (d.contact?'<p>👤 '+esc(d.contact)+'</p>':'') +
          (d.phone?'<p>📞 '+esc(d.phone)+'</p>':'') +
          (d.email?'<p>✉️ '+esc(d.email)+'</p>':'') +
          '<p class="sales-amount">₹ '+(Number(d.sales)||0).toLocaleString()+'</p>' +
        '</div>' +
        '<div class="card-footer">' +
          '<button onclick="editDealer('+d.id+')"  class="card-btn edit-btn">✏️ Edit</button>' +
          '<button onclick="viewDetails('+d.id+')" class="card-btn view-btn-card">👁️ View</button>' +
        '</div></div>'
      ); }).join('')
    : '<p style="padding:24px;color:#94a3b8;">No dealers found.</p>';
}

function updateStats(list) {
  document.getElementById('totalDealers').textContent  = list.length;
  document.getElementById('activeDealers').textContent = list.filter(function(d){ return d.status==='Active'; }).length;
  var tot = list.reduce(function(s,d){ return s+d.sales; }, 0);
  document.getElementById('totalSales').textContent    = '₹'+tot.toLocaleString();
  var top = list.length ? list.reduce(function(m,d){ return d.sales>m.sales?d:m; }) : null;
  document.getElementById('topPerformer').textContent  = top ? top.name : '-';
}

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── Actions ───────────────────────────────────────────────────────────────────
function toggleStatus(id) {
  var d = dealers.find(function(x){ return x.id===id; });
  if(d) d.status = d.status==='Active' ? 'Inactive' : 'Active';
  // sync to backend if available
  if (backendAvailable) {
    fetch(API + '/dealers/' + id, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(d)
    }).then(function(r){ if(!r.ok) throw new Error(); render(); }).catch(function(){ render(); });
  } else {
    render();
  }
}
function editDealer(id) {
  var d = dealers.find(function(x){ return x.id===id; });
  if(!d) return;
  document.getElementById('modalTitle').textContent   = 'Edit Dealer';
  document.getElementById('dealerId').value           = d.id;
  document.getElementById('dealerCode').value         = d.code || '';
  document.getElementById('dealerName').value         = d.name || '';
  document.getElementById('dealerContact').value      = d.contact || '';
  document.getElementById('dealerPhone').value        = d.phone || '';
  document.getElementById('dealerEmail').value        = d.email || '';
  document.getElementById('dealerAddress').value      = d.address || '';
  document.getElementById('dealerPin').value          = d.pin || '';
  document.getElementById('dealerGstin').value        = d.gstin || '';
  document.getElementById('dealerEstablished').value  = d.established || '';
  document.getElementById('dealerLocation').value     = d.location || '';
  document.getElementById('dealerSales').value        = d.sales || 0;
  document.getElementById('dealerStatus').value       = d.status || 'Active';
  openModal();
}
function deleteDealer(id) {
  if(!confirm('Delete this dealer?')) return;
  // delete on backend when possible
  if (backendAvailable) {
    fetch(API + '/dealers/' + id, { method: 'DELETE' })
      .then(function(r){ if(!r.ok) throw new Error(); dealers = dealers.filter(function(d){ return d.id!==id; }); render(); })
      .catch(function(){ alert('Failed to delete on server, please try again.'); });
  } else {
    dealers = dealers.filter(function(d){ return d.id!==id; }); render();
  }
}
function viewDetails(id) {
  var d = dealers.find(function(x){ return x.id===id; });
  if(!d) return;
  var txt = [
    'Dealer Details',
    '',
    'Code:       '+(d.code||''),
    'Name:       '+(d.name||''),
    'Contact:    '+(d.contact||''),
    'Phone:      '+(d.phone||''),
    'Email:      '+(d.email||''),
    'Address:    '+(d.address||''),
    'PIN:        '+(d.pin||''),
    'GSTIN:      '+(d.gstin||''),
    'Location:   '+(d.location||''),
    'Established:'+((d.established&&d.established.split('T')[0])||''),
    'Sales:      ₹'+((Number(d.sales)||0).toLocaleString()),
    'Status:     '+(d.status||'')
  ].join('\n');
  alert(txt);
}
function exportToCSV() {
  var headers = ['Code','Name','Contact','Phone','Email','Address','PIN','GSTIN','Location','Established','Sales','Status'];
  var csv = headers.join(',') + '\n' +
    dealers.map(function(d){
      return [d.code,d.name,d.contact,d.phone,d.email,d.address,d.pin,d.gstin,d.location,d.established,Number(d.sales)||0,d.status].map(function(v){ return '"'+String(v||'')+'"'; }).join(',');
    }).join('\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = 'dealers.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal()  { document.getElementById('dealerModal').style.display = 'flex'; }
function closeModal() {
  document.getElementById('dealerModal').style.display = 'none';
  document.getElementById('dealerForm').reset();
  document.getElementById('dealerId').value = '';
}

// ── Wire up events after DOM ready ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function(){
  document.getElementById('dealerForm').addEventListener('submit', function(e){
    e.preventDefault();
    var id  = document.getElementById('dealerId').value;
    var obj = {
      code:        document.getElementById('dealerCode').value.trim(),
      name:        document.getElementById('dealerName').value.trim(),
      contact:     document.getElementById('dealerContact').value.trim(),
      phone:       document.getElementById('dealerPhone').value.trim(),
      email:       document.getElementById('dealerEmail').value.trim(),
      address:     document.getElementById('dealerAddress').value.trim(),
      pin:         document.getElementById('dealerPin').value.trim(),
      gstin:       document.getElementById('dealerGstin').value.trim(),
      established: document.getElementById('dealerEstablished').value,
      location:    document.getElementById('dealerLocation').value.trim(),
      sales:       parseInt(document.getElementById('dealerSales').value, 10) || 0,
      status:      document.getElementById('dealerStatus').value
    };
    if (id) {
      var intId = parseInt(id,10);
      if (backendAvailable) {
        fetch(API + '/dealers/' + intId, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(obj) })
          .then(function(r){ if(!r.ok) throw new Error(); return r.json(); })
          .then(function(){
            var idx = dealers.findIndex(function(d){ return d.id===intId; });
            if(idx!==-1) dealers[idx] = Object.assign({id:intId}, obj);
            closeModal(); render();
          }).catch(function(){ alert('Failed to update dealer on server.'); closeModal(); render(); });
      } else {
        var idx = dealers.findIndex(function(d){ return d.id===intId; });
        if(idx!==-1) dealers[idx] = Object.assign({id:intId}, obj);
        closeModal(); render();
      }
    } else {
      if (backendAvailable) {
        fetch(API + '/dealers', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(obj) })
          .then(function(r){ if(!r.ok) throw new Error(); return r.json(); })
          .then(function(data){
            // server returns id
            dealers.push(Object.assign({id: data.id}, obj));
            closeModal(); render();
          }).catch(function(){ alert('Failed to create dealer on server.'); closeModal(); render(); });
      } else {
        dealers.push(Object.assign({id: nextId++}, obj));
        closeModal(); render();
      }
    }
  });

  document.getElementById('searchInput').addEventListener('input',   render);
  document.getElementById('statusFilter').addEventListener('change', render);
  document.getElementById('addDealerBtn').addEventListener('click',  function(){ document.getElementById('modalTitle').textContent='Add New Dealer'; closeModal(); openModal(); });
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('exportBtn').addEventListener('click', exportToCSV);
  document.getElementById('tableViewBtn').addEventListener('click',  function(){ currentView='table'; document.getElementById('tableView').style.display='block'; document.getElementById('cardView').style.display='none'; document.getElementById('tableViewBtn').classList.add('active'); document.getElementById('cardViewBtn').classList.remove('active'); render(); });
  document.getElementById('cardViewBtn').addEventListener('click',   function(){ currentView='card';  document.getElementById('tableView').style.display='none';  document.getElementById('cardView').style.display='block'; document.getElementById('cardViewBtn').classList.add('active'); document.getElementById('tableViewBtn').classList.remove('active'); render(); });
  document.getElementById('dealerModal').addEventListener('click',  function(e){ if(e.target===this) closeModal(); });

  render();
  loadFromAPI();
});

// ── AI Insights (added) ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Insert AI insight box above the search bar
  const anchor = document.getElementById('aiDealerAnchor');
  if (!anchor) return;

  const box = document.createElement('div');
  box.style.cssText = 'background:white;border-radius:15px;padding:20px 24px;margin-bottom:20px;box-shadow:0 2px 10px rgba(0,0,0,0.08);border-left:4px solid #667eea;';
  box.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <h3 style="color:#1e293b;font-size:15px;">🤖 AI Sales Insights</h3>
      <button id="dealerAIBtn" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">✨ Analyze with AI</button>
    </div>
    <div id="dealerAIResult" style="margin-top:12px;color:#475569;font-size:14px;line-height:1.7;display:none;"></div>
  `;
  anchor.appendChild(box);

  document.getElementById('dealerAIBtn').addEventListener('click', async function() {
    const btn = this;
    const result = document.getElementById('dealerAIResult');
    btn.textContent = '⏳ Analyzing...';
    btn.disabled = true;
    result.style.display = 'block';
    result.innerHTML = '<span style="color:#667eea;">AI is analyzing your dealer data...</span>';
    try {
      const text = await getSalesInsight('Dealer', dealers);
      result.innerHTML = text.split('\n').filter(l=>l.trim()).map(l =>
        l.startsWith('-')||l.startsWith('•')||l.startsWith('*')
          ? `<div style="padding:4px 0 4px 14px;border-left:3px solid #667eea;margin:5px 0;">${l.replace(/^[-•*]\s*/,'')}</div>`
          : `<p style="margin:5px 0;">${l}</p>`
      ).join('');
      btn.textContent = '✨ Refresh';
    } catch(e) {
      result.innerHTML = '<span style="color:#ef4444;">⚠️ AI unavailable. Check connection.</span>';
      btn.textContent = '✨ Retry';
    }
    btn.disabled = false;
  });
});