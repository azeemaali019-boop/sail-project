// auth.js — included by every protected page (NOT form.html)
// Runs immediately: if not logged in, kick to login page.

(function() {
  var page = window.location.pathname.split('/').pop();
  // Allow blank path (root) to pass through — Live Server may serve index
  if (page === '' || page === 'form.html') return;

  if (localStorage.getItem('loggedIn') !== 'true') {
    window.location.replace('form.html');
    return; // stop rest of script executing
  }

  // Once DOM is ready: highlight sidebar + wire logout
  document.addEventListener('DOMContentLoaded', function() {
    var current = window.location.pathname.split('/').pop() || 'dashboard.html';

    document.querySelectorAll('.sidebar ul li a').forEach(function(link) {
      var href = link.getAttribute('href');

      // Highlight active page
      if (href === current) {
        link.classList.add('active');
      }

      // Logout — clear session then go to login
      if (href === 'form.html') {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          localStorage.removeItem('loggedIn');
          localStorage.removeItem('userRole');
          window.location.href = 'form.html';
        });
      }
    });

    // Show role in profile badge if element exists
    var badge = document.getElementById('profileLabel');
    if (badge) {
      var role = localStorage.getItem('userRole');
      if (role) badge.textContent = role;
    }
  });
})();