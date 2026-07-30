document.addEventListener('DOMContentLoaded', function () {
    // ===== Hamburger toggle =====
    const toggle = document.getElementById('navToggle');
    const navbar = document.getElementById('navbar');

    if (toggle && navbar) {
        toggle.addEventListener('click', function () {
            navbar.classList.toggle('open');
            toggle.classList.toggle('active');
        });
    }

    // ===== Set active nav link based on current page =====
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('#navbar a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
});