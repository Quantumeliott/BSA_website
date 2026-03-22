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
 
  if (el('d-timer'))  el('d-timer').textContent  = `${m}:${s}`;
  if (el('d-spent'))  el('d-spent').textContent  = spent.toFixed(3);
  if (el('d-remain')) el('d-remain').textContent = rem.toFixed(3);
  if (el('d-bar1'))   el('d-bar1').style.width   = p1 + '%';
  if (el('d-bar2'))   el('d-bar2').style.width   = p2 + '%';
 
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