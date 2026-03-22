// =============================================
// router.js — navigation entre les pages
// =============================================

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  window.scrollTo(0, 0);
  checkMobileBtn();
}

function checkMobileBtn() {
  const btn = document.getElementById('mobile-menu-btn');
  if (btn) btn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
}
window.addEventListener('resize', checkMobileBtn);
checkMobileBtn();

function showAuth(tab) {
  showPage('auth');
  switchTab(tab || 'login');
}

function switchTab(t) {
  ['login', 'register'].forEach(id => {
    const tabEl   = document.getElementById('tab-' + id);
    const panelEl = document.getElementById('panel-' + id);
    if (tabEl)   tabEl.classList.toggle('active', id === t);
    if (panelEl) panelEl.classList.toggle('active', id === t);
  });
}

// ---- Dashboard sub-pages ----
const dpTitles = {
  overview: 'Overview',
  browse:   'Browse Instruments',
  bookings: 'My Sessions',
  wallet:   'Wallet',
  settings: 'Settings',
};

function showDP(id) {
  // Masquer toutes les pages
  document.querySelectorAll('.dash-page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('dp-' + id);
  if (target) target.classList.add('active');

  // Titre topbar
  const titleEl = document.getElementById('dp-title');
  if (titleEl) titleEl.textContent = dpTitles[id] || id;

  // Sidebar actif — cherche par data-page
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === id);
  });

  closeSidebar();
}

// ---- Sidebar mobile ----
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sb-overlay').classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('show');
}

// ---- Landing mobile menu ----
let landingMenuOpen = false;

function toggleLandingMenu() {
  landingMenuOpen = !landingMenuOpen;
  const m = document.getElementById('landing-mobile-menu');
  if (m) m.style.display = landingMenuOpen ? 'flex' : 'none';
}

function closeLandingMenu() {
  landingMenuOpen = false;
  const m = document.getElementById('landing-mobile-menu');
  if (m) m.style.display = 'none';
}