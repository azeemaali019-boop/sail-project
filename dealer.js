// Check user login
const currentPage = window.location.pathname.split('/').pop();
if (currentPage !== 'form.html' && localStorage.getItem('loggedIn') !== 'true') {
    window.location.href = 'form.html';
}

// Logout Function
function logout() {
    localStorage.removeItem('loggedIn');
    window.location.href = 'form.html';
}

// Initial dealer data
let dealers = [
    { id: 1, name: "Dealer A", location: "Mumbai", sales: 120000, status: "Active" },
    { id: 2, name: "Dealer B", location: "Delhi", sales: 85000, status: "Active" },
    { id: 3, name: "Dealer C", location: "Bangalore", sales: 60000, status: "Inactive" },
    { id: 4, name: "Dealer DD", location: "Jharkhand", sales: 120000, status: "Active" }
];

const API_BASE_URL = 'http://127.0.0.1:5000';

async function loadDealersFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/dealers`);
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const apiDealers = await response.json();
        if (Array.isArray(apiDealers) && apiDealers.length) {
            dealers = apiDealers.map(d => ({
                id: d.id,
                name: d.name,
                location: d.location,
                sales: d.sales,
                status: d.status
            }));
            nextId = Math.max(...dealers.map(d => d.id)) + 1;
        }
    } catch (error) {
        console.warn('Could not load dealers from backend:', error);
    } finally {
        renderDealers();
    }
}

let nextId = 5;
let currentView = 'table';

// DOM Elements
const dealerTableBody = document.getElementById('dealerTableBody');
const dealerCardContainer = document.getElementById('dealerCardContainer');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const tableViewBtn = document.getElementById('tableViewBtn');
const cardViewBtn = document.getElementById('cardViewBtn');
const modal = document.getElementById('dealerModal');
const addDealerBtn = document.getElementById('addDealerBtn');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelBtn');
const dealerForm = document.getElementById('dealerForm');
const exportBtn = document.getElementById('exportBtn');

// Render dealers based on filters
function renderDealers() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;
    
    let filteredDealers = dealers.filter(dealer => {
        const matchesSearch = dealer.name.toLowerCase().includes(searchTerm) || 
                             dealer.location.toLowerCase().includes(searchTerm);
        const matchesStatus = statusValue === 'all' || dealer.status === statusValue;
        return matchesSearch && matchesStatus;
    });
    
    updateStatistics(filteredDealers);
    
    if (currentView === 'table') {
        renderTableView(filteredDealers);
    } else {
        renderCardView(filteredDealers);
    }
}

// Render Table View
function renderTableView(dealersList) {
    dealerTableBody.innerHTML = dealersList.map(dealer => `
        <tr>
            <td><strong>${dealer.name}</strong></td>
            <td><i class="fas fa-map-marker-alt"></i> ${dealer.location}</td>
            <td><i class="fas fa-rupee-sign"></i> ${dealer.sales.toLocaleString()}</td>
            <td>
                <label class="switch">
                    <input type="checkbox" ${dealer.status === 'Active' ? 'checked' : ''} 
                           onchange="toggleStatus(${dealer.id})">
                    <span class="slider round"></span>
                </label>
                <span class="status-text ${dealer.status === 'Active' ? 'status-active' : 'status-inactive'}">
                    ${dealer.status}
                </span>
            </td>
            <td class="action-buttons">
                <button class="action-edit" onclick="editDealer(${dealer.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-delete" onclick="deleteDealer(${dealer.id})">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="action-view" onclick="viewDetails(${dealer.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Render Card View
function renderCardView(dealersList) {
    dealerCardContainer.innerHTML = dealersList.map(dealer => `
        <div class="dealer-card ${dealer.status === 'Active' ? 'card-active' : 'card-inactive'}">
            <div class="card-header">
                <div class="dealer-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="dealer-status-badge ${dealer.status === 'Active' ? 'badge-active' : 'badge-inactive'}">
                    ${dealer.status}
                </div>
            </div>
            <div class="card-body">
                <h3>${dealer.name}</h3>
                <p><i class="fas fa-map-marker-alt"></i> ${dealer.location}</p>
                <p class="sales-amount"><i class="fas fa-rupee-sign"></i> ${dealer.sales.toLocaleString()}</p>
            </div>
            <div class="card-footer">
                <button onclick="editDealer(${dealer.id})" class="card-btn edit-btn">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="viewDetails(${dealer.id})" class="card-btn view-btn-card">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');
}

// Update statistics
function updateStatistics(filteredDealers) {
    document.getElementById('totalDealers').textContent = filteredDealers.length;
    const activeCount = filteredDealers.filter(d => d.status === 'Active').length;
    document.getElementById('activeDealers').textContent = activeCount;
    const totalSales = filteredDealers.reduce((sum, d) => sum + d.sales, 0);
    document.getElementById('totalSales').textContent = `₹${totalSales.toLocaleString()}`;
    const topDealer = filteredDealers.reduce((max, d) => d.sales > max.sales ? d : max, filteredDealers[0]);
    document.getElementById('topPerformer').textContent = topDealer ? topDealer.name : '-';
}

// Toggle status
function toggleStatus(id) {
    const dealer = dealers.find(d => d.id === id);
    dealer.status = dealer.status === 'Active' ? 'Inactive' : 'Active';
    renderDealers();
}

// Edit dealer
function editDealer(id) {
    const dealer = dealers.find(d => d.id === id);
    document.getElementById('modalTitle').textContent = 'Edit Dealer';
    document.getElementById('dealerId').value = dealer.id;
    document.getElementById('dealerName').value = dealer.name;
    document.getElementById('dealerLocation').value = dealer.location;
    document.getElementById('dealerSales').value = dealer.sales;
    document.getElementById('dealerStatus').value = dealer.status;
    modal.style.display = 'block';
}

// Delete dealer
function deleteDealer(id) {
    if (confirm('Are you sure you want to delete this dealer?')) {
        dealers = dealers.filter(d => d.id !== id);
        renderDealers();
    }
}

// View details
function viewDetails(id) {
    const dealer = dealers.find(d => d.id === id);
    alert(`📋 Dealer Details:\n\nName: ${dealer.name}\nLocation: ${dealer.location}\nSales: ₹${dealer.sales.toLocaleString()}\nStatus: ${dealer.status}`);
}

// Export to CSV
function exportToCSV() {
    let csv = 'Dealer Name,Location,Total Sales (₹),Status\n';
    dealers.forEach(dealer => {
        csv += `"${dealer.name}",${dealer.location},${dealer.sales},${dealer.status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dealers_data.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// Add/Edit dealer form submit
dealerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('dealerId').value;
    const name = document.getElementById('dealerName').value;
    const location = document.getElementById('dealerLocation').value;
    const sales = parseInt(document.getElementById('dealerSales').value);
    const status = document.getElementById('dealerStatus').value;
    
    if (id) {
        // Edit existing
        const index = dealers.findIndex(d => d.id === parseInt(id));
        dealers[index] = { ...dealers[index], name, location, sales, status };
    } else {
        // Add new
        dealers.push({ id: nextId++, name, location, sales, status });
    }
    
    modal.style.display = 'none';
    dealerForm.reset();
    document.getElementById('dealerId').value = '';
    renderDealers();
});

// Event listeners
searchInput.addEventListener('input', renderDealers);
statusFilter.addEventListener('change', renderDealers);
tableViewBtn.addEventListener('click', () => {
    currentView = 'table';
    document.getElementById('tableView').style.display = 'block';
    document.getElementById('cardView').style.display = 'none';
    tableViewBtn.classList.add('active');
    cardViewBtn.classList.remove('active');
    renderDealers();
});
cardViewBtn.addEventListener('click', () => {
    currentView = 'card';
    document.getElementById('tableView').style.display = 'none';
    document.getElementById('cardView').style.display = 'block';
    cardViewBtn.classList.add('active');
    tableViewBtn.classList.remove('active');
    renderDealers();
});
addDealerBtn.onclick = () => {
    document.getElementById('modalTitle').textContent = 'Add New Dealer';
    dealerForm.reset();
    document.getElementById('dealerId').value = '';
    modal.style.display = 'block';
};
closeBtn.onclick = () => modal.style.display = 'none';
cancelBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
exportBtn.onclick = exportToCSV;

// Initial render with API connection
loadDealersFromAPI();
document.getElementById("searchInput").addEventListener("keyup", function () {
    let value = this.value.toUpperCase();
    let rows = document.querySelectorAll("#dealerTable tbody tr");

    rows.forEach(row => {
        let dealerId = row.cells[0].textContent.toUpperCase();
        row.style.display = dealerId.includes(value) ? "" : "none";
    });
});