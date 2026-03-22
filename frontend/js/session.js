// =============================================
// QUANTUMGRID — Live Session Module
// Simulates a real XRPL Payment Channel session
// Replace addClaim() with real xrpl.js calls
// =============================================

const SESSION_CONFIG = {
  totalMinutes: 30,
  ratePerMin:   0.48,     // XRP/min for this instrument
  claimInterval: 30,      // seconds between on-chain claims
};

const SESSION = {
  seconds:    0,
  totalSec:   SESSION_CONFIG.totalMinutes * 60,
  totalXRP:   SESSION_CONFIG.totalMinutes * SESSION_CONFIG.ratePerMin,
  intervalId: null,
};

/**
 * Start the live session timer.
 * Call this on DOMContentLoaded.
 */
export function startSession() {
  SESSION.intervalId = setInterval(tick, 1000);
}

function tick() {
  SESSION.seconds++;
  updateTimer();
  updateXRP();
  updateBars();

  if (SESSION.seconds % SESSION_CONFIG.claimInterval === 0) {
    const spent = computeSpent();
    addClaimRow(spent);
  }
}

function computeSpent() {
  return (SESSION.seconds / 60) * SESSION_CONFIG.ratePerMin;
}

function updateTimer() {
  const mins = Math.floor(SESSION.seconds / 60).toString().padStart(2, '0');
  const secs = (SESSION.seconds % 60).toString().padStart(2, '0');
  document.getElementById('timer').textContent = `${mins}:${secs}`;
}

function updateXRP() {
  const spent     = computeSpent();
  const remaining = Math.max(0, SESSION.totalXRP - spent);
  document.getElementById('xrp-spent').textContent     = spent.toFixed(3);
  document.getElementById('xrp-remaining').textContent = remaining.toFixed(3);
}

function updateBars() {
  const spent = computeSpent();
  const pctXRP  = Math.min(100, (spent / SESSION.totalXRP) * 100);
  const pctTime = Math.min(100, (SESSION.seconds / SESSION.totalSec) * 100);

  document.getElementById('bar-fill').style.width   = pctXRP  + '%';
  document.getElementById('bar-fill2').style.width  = pctTime + '%';
  document.getElementById('pct').textContent        = pctXRP.toFixed(1)  + '%';
  document.getElementById('pct2').textContent       = pctTime.toFixed(1) + '%';
}

/**
 * Appends a new Payment Channel claim row to the TX log.
 * In production: replace with real XRPL PaymentChannel claim signing.
 *
 * @param {number} amount - cumulative XRP spent so far
 */
function addClaimRow(amount) {
  const log  = document.getElementById('tx-log');
  const hash = '0x' + Math.random().toString(16).slice(2, 10).toUpperCase() + '...';

  const row = document.createElement('div');
  row.className = 'tx-row';
  row.innerHTML = `
    <span class="tx-hash">${hash}</span>
    <span class="tx-amount">−${amount.toFixed(3)} XRP</span>
    <span class="tx-status">✓ SETTLED</span>
  `;
  log.appendChild(row);
}
// =============================================
// session.js — chronomètre session live
// =============================================

let sec = 0;
const TOTAL     = 1800;  // 30 min
const RATE      = 0.48;  // XRP/min
const TOTAL_XRP = 14.4;

setInterval(() => {
  sec++;
  const m     = Math.floor(sec / 60).toString().padStart(2, '0');
  const s     = (sec % 60).toString().padStart(2, '0');
  const spent = (sec / 60) * RATE;
  const rem   = Math.max(0, TOTAL_XRP - spent);
  const p1    = Math.min(100, (spent / TOTAL_XRP) * 100);
  const p2    = Math.min(100, (sec / TOTAL) * 100);

  const el = id => document.getElementById(id);

  if (el('d-timer'))  el('d-timer').textContent    = `${m}:${s}`;
  if (el('d-spent'))  el('d-spent').textContent    = spent.toFixed(3);
  if (el('d-remain')) el('d-remain').textContent   = rem.toFixed(3);
  if (el('d-bar1'))   el('d-bar1').style.width     = p1 + '%';
  if (el('d-bar2'))   el('d-bar2').style.width     = p2 + '%';

  // Log un claim toutes les 30 secondes
  if (sec % 30 === 0 && el('d-tx-log')) {
    const hash = '0x' + Math.random().toString(16).slice(2, 10).toUpperCase() + '...';
    const row  = document.createElement('div');
    row.className = 'tx-row';
    row.innerHTML = `
      <span class="tx-hash">${hash}</span>
      <span class="tx-amt">−${spent.toFixed(3)} XRP</span>
      <span class="tx-ok">✓</span>`;
    el('d-tx-log').appendChild(row);
  }
}, 1000);
