// =============================================
// session.js — sessions réelles depuis la DB
// =============================================

const RATE = 0.48;

// ---- Charge et affiche les sessions de l'user ----
async function loadSessions() {
  const userId = localStorage.getItem('quantum_user_id');
  if (!userId) return;

  const tbody = document.getElementById('sessions-tbody');
  if (!tbody) return;

  try {
    const res  = await fetch(`${API_URL}/sessions?userId=${userId}`);
    if (!res.ok) return;
    const data = await res.json();
    const sessions = data.sessions ?? [];

    if (!sessions.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:40px;font-size:11px;letter-spacing:.1em;">Aucune session pour l\'instant</td></tr>';
      return;
    }

    // Mise à jour "Locked in Escrow" = somme des sessions ACTIVE/PENDING
    const locked = sessions
      .filter(s => s.status === 'ACTIVE' || s.status === 'PENDING')
      .reduce((sum, s) => sum + (s.priceXRP || 0), 0);
    const el = document.getElementById('wallet-escrow');
    if (el) el.textContent = locked.toFixed(2);

    // Affichage du tableau
    tbody.innerHTML = sessions.map(s => {
      const name    = s.instrument?.name  || '—';
      const type    = s.instrument?.type  || '—';
      const date    = new Date(s.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
      const price   = (s.priceXRP || 0).toFixed(2) + ' XRP';
      const hash    = s.xrplTxHash ? s.xrplTxHash.slice(0,6) + '...' + s.xrplTxHash.slice(-4) : '—';
      const hashFull = s.xrplTxHash || '';

      const statusMap = {
        ACTIVE:    '<span class="pill pill-g">Live</span>',
        PENDING:   '<span class="pill pill-o">Pending</span>',
        COMPLETED: '<span class="pill pill-d">Done</span>',
        CANCELLED: '<span class="pill pill-d" style="color:var(--orange)">Cancelled</span>',
      };
      const pill = statusMap[s.status] || s.status;

      return `<tr>
        <td>${name}</td>
        <td>${type}</td>
        <td>${date}</td>
        <td>${(s.priceXRP / RATE).toFixed(0)} min</td>
        <td>${price}</td>
        <td style="color:var(--cyan);font-size:10px" title="${hashFull}">${hash}</td>
        <td>${pill}</td>
      </tr>`;
    }).join('');

    // Si session active → démarre le chrono live
    const active = sessions.find(s => s.status === 'ACTIVE');
    if (active) startLiveTimer(active);

  } catch (err) {
    console.warn('[sessions] Erreur:', err);
  }
}

// ---- Chrono live pour session active ----
let _timerInterval = null;

function startLiveTimer(session) {
  if (_timerInterval) clearInterval(_timerInterval);

  const startTime = new Date(session.startedAt || session.createdAt).getTime();
  const totalSec  = Math.round((session.priceXRP / RATE) * 60);
  const totalXRP  = session.priceXRP;

  _timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m       = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s       = (elapsed % 60).toString().padStart(2, '0');
    const spent   = (elapsed / 60) * RATE;
    const rem     = Math.max(0, totalXRP - spent);
    const p1      = Math.min(100, (spent / totalXRP) * 100);
    const p2      = Math.min(100, (elapsed / totalSec) * 100);

    const el = id => document.getElementById(id);
    if (el('d-timer'))  el('d-timer').textContent  = `${m}:${s}`;
    if (el('d-spent'))  el('d-spent').textContent  = spent.toFixed(3);
    if (el('d-remain')) el('d-remain').textContent = rem.toFixed(3);
    if (el('d-bar1'))   el('d-bar1').style.width   = p1 + '%';
    if (el('d-bar2'))   el('d-bar2').style.width   = p2 + '%';
  }, 1000);
}

// ---- Chargement auto quand on va sur My Sessions ----
const _origShowDP = typeof showDP === 'function' ? showDP : null;
document.addEventListener('DOMContentLoaded', () => {
  // Patch showDP pour charger les sessions automatiquement
  const origShowDP = window.showDP;
  window.showDP = function(id) {
    origShowDP(id);
    if (id === 'bookings') loadSessions();
  };
});