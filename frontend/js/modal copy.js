// =============================================
// modal.js — modal de réservation + utilitaires
// =============================================

let _rate = 0.48;
let _type = 'telescope';

function showBookModal(name, rate, type) {
  _rate = parseFloat(rate);
  _type = type;

  document.getElementById('m-name').textContent = name;
  document.getElementById('m-type').textContent = type === 'quantum'
    ? 'Payment Channel · Pay per Shot'
    : 'XRPL Escrow · Time-locked';

  updateCost();
  document.getElementById('modal').style.display = 'flex';
}

function closeModal(e) {
  if (e.target === document.getElementById('modal')) {
    document.getElementById('modal').style.display = 'none';
  }
}

function updateCost() {
  const d = parseInt(document.getElementById('m-dur').value) || 30;
  document.getElementById('m-cost').textContent = (d * _rate).toFixed(2) + ' XRP';
}

function confirmBook() {
  document.getElementById('modal').style.display = 'none';
  toast('✓ Escrow soumis sur XRPL Testnet');
}

// ---- Wallet ----
function copyAddr() {
  navigator.clipboard.writeText(DEMO_WALLET_ADDRESS)
    .then(()  => toast('Adresse copiée !'))
    .catch(()  => toast('Échec de la copie'));
}

// ---- Toast ----
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}
