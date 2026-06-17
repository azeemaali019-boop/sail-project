// app_api.js — Shared data fetching and rendering for pages
var API_BASE_URL = 'http://127.0.0.1:5000';

function formatCurrency(v) {
    return '₹' + Number(v).toLocaleString();
}

function renderTable(cols, rows, tbodyId) {
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    if (!rows || !rows.length) {
        var colCount = cols.length + (tbodyId === 'distributorTableBody' ? 1 : 0);  // +1 for S.No
        tbody.innerHTML = '<tr><td colspan="' + colCount + '" style="text-align:center;padding:30px;color:#94a3b8;">No records.</td></tr>';
        return;
    }
    var isDistributor = tbodyId === 'distributorTableBody';
    tbody.innerHTML = rows.map(function (r, idx) {
        var cells = '';
        if (isDistributor) cells += '<td style="font-weight:600;color:#475569;">' + (idx + 1) + '</td>';
        cells += cols.map(function (c) {
            var val = r[c.key];
            if (c.type === 'currency') val = formatCurrency(val);
            if (c.type === 'date') val = (new Date(val)).toLocaleString();
            return '<td>' + (val === undefined || val === null ? '' : String(val)) + '</td>';
        }).join('');
        return '<tr>' + cells + '</tr>';
    }).join('');
}

function exportCSV(rows, cols, filename) {
    var isDistributor = filename === 'distributors.csv';
    var csv = '';
    if (isDistributor) csv += '"S.No",';
    csv += cols.map(function (c) { return '"' + c.label + '"'; }).join(',') + '\n';
    rows.forEach(function (r, idx) {
        if (isDistributor) csv += (idx + 1) + ',';
        csv += cols.map(function (c) {
            var v = r[c.key];
            if (v === null || v === undefined) v = '';
            return '"' + String(v).replace(/"/g,'""') + '"';
        }).join(',') + '\n';
    });
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = filename || 'export.csv';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function fetchAndRender() {
    var page = document.body.dataset.page;
    if (!page) return;

    if (page === 'distributors') {
        fetch(API_BASE_URL + '/api/distributors').then(r=>r.json()).then(function (data) {
            var cols = [
                { key: 'name', label: 'Name' },
                { key: 'contact', label: 'Contact' },
                { key: 'location', label: 'Location' },
                { key: 'status', label: 'Status' }
            ];
            renderTable(cols, data, 'distributorTableBody');
            document.getElementById('exportBtn')?.addEventListener('click', function () { exportCSV(data, cols, 'distributors.csv'); });

            // update simple stats
            try {
                document.getElementById('totalDistributors').textContent = data.length;
                document.getElementById('activeDistributors').textContent = data.filter(d=>d.status==='Active').length;
                document.getElementById('topDistributor').textContent = (data[0] && data[0].name) || '-';
            } catch(e){}
        }).catch(console.error);
    }

    if (page === 'inventory') {
        fetch(API_BASE_URL + '/api/inventory').then(r=>r.json()).then(function (data) {
            var cols = [
                { key: 'id', label: 'SKU' },
                { key: 'product_name', label: 'Product' },
                { key: 'warehouse', label: 'Warehouse' },
                { key: 'quantity', label: 'Stock' },
                { key: 'status', label: 'Status' }
            ];
            renderTable(cols, data, 'inventoryTableBody');
            document.getElementById('exportBtn')?.addEventListener('click', function () { exportCSV(data, cols, 'inventory.csv'); });

            // stats
            try {
                document.getElementById('totalSKUs').textContent = data.length;
                var low = data.filter(item => item.status === 'Low Stock').length;
                document.getElementById('lowStockCount').textContent = low;
                var warehouses = Array.from(new Set(data.map(it=>it.warehouse))).filter(Boolean).length;
                document.getElementById('warehouseCount').textContent = warehouses;

                // populate warehouse filter
                var wf = document.getElementById('warehouseFilter');
                if (wf) {
                    var existing = new Set();
                    data.forEach(function(it){ if (it.warehouse) existing.add(it.warehouse); });
                    existing.forEach(function(w){
                        var opt = document.createElement('option'); opt.value = w; opt.textContent = w; wf.appendChild(opt);
                    });
                    wf.addEventListener('change', function(){
                        var val = wf.value;
                        document.querySelectorAll('#inventoryTableBody tr').forEach(function(tr){
                            if (val === 'all') { tr.style.display = ''; return; }
                            tr.style.display = tr.textContent.includes(val) ? '' : 'none';
                        });
                    });
                }
            } catch(e){}
        }).catch(console.error);
    }

    if (page === 'financial') {
        fetch(API_BASE_URL + '/api/transactions').then(r=>r.json()).then(function (data) {
            var cols = [
                { key: 'id', label: 'ID' },
                { key: 'date', label: 'Date', type: 'date' },
                { key: 'description', label: 'Description' },
                { key: 'amount', label: 'Amount', type: 'currency' },
                { key: 'type', label: 'Type' }
            ];
            renderTable(cols, data, 'financialTableBody');
            document.getElementById('exportBtn')?.addEventListener('click', function () { exportCSV(data, cols, 'transactions.csv'); });

            // compute ledger stats
            try {
                var balance = data.reduce(function(s, t){ return s + (Number(t.amount) || 0); }, 0);
                var credit = data.reduce(function(s, t){ var v = Number(t.amount)||0; return s + (v>0? v:0); }, 0);
                var debit  = data.reduce(function(s, t){ var v = Number(t.amount)||0; return s + (v<0? Math.abs(v):0); }, 0);
                document.getElementById('ledgerBalance').textContent = formatCurrency(balance);
                document.getElementById('totalCredit').textContent = formatCurrency(credit);
                document.getElementById('totalDebit').textContent = formatCurrency(debit);

                // basic filter
                var tf = document.getElementById('typeFilter');
                if (tf) tf.addEventListener('change', function(){
                    var val = tf.value;
                    document.querySelectorAll('#financialTableBody tr').forEach(function(tr){
                        if (val === 'all') { tr.style.display = ''; return; }
                        tr.style.display = tr.textContent.toLowerCase().includes(val) ? '' : 'none';
                    });
                });
            } catch(e){}
        }).catch(console.error);
    }

    if (page === 'reports') {
        fetch(API_BASE_URL + '/api/reports').then(r=>r.json()).then(function (data) {
            // reports endpoint returns summary and lists
            var summary = data.summary || {};
            document.getElementById('reportTotalSales').textContent = formatCurrency(summary.total_sales || 0);
            document.getElementById('reportTotalTransactions').textContent = summary.total_transactions || 0;

            var cols = [
                { key: 'id', label: 'ID' },
                { key: 'title', label: 'Title' },
                { key: 'value', label: 'Value' }
            ];
            renderTable(cols, data.items || [], 'reportsTableBody');
        }).catch(console.error);
    }
}

window.addEventListener('load', function () { setTimeout(fetchAndRender, 200); });
