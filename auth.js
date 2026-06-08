// ─── auth.js ─────────────────────────────────────────────────────────────────
// Shared across all protected pages. Include BEFORE page-specific scripts.

// 1. Auth guard — redirect to login if not logged in
(function () {
    const page = window.location.pathname.split('/').pop();
    if (page !== 'form.html' && localStorage.getItem('loggedIn') !== 'true') {
        window.location.href = 'form.html';
    }
})();

// 2. Sidebar: highlight active link + handle logout
document.addEventListener('DOMContentLoaded', function () {
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

    document.querySelectorAll('.sidebar ul li a').forEach(function (link) {
        // Highlight current page
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }

        // Logout link — clear session then navigate
        if (link.getAttribute('href') === 'form.html') {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                localStorage.removeItem('loggedIn');
                localStorage.removeItem('userRole');
                window.location.href = 'form.html';
            });
        }
    });
});