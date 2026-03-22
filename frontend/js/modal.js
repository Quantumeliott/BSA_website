// =============================================
// modal.js — modal de réservation + toast
// =============================================

let _rate = 0.48;
let _type = 'telescope';

function showBookModal(name, rate, type, instrumentId, providerAddr) {
  _rate = parseFloat(rate);
  _type = type;

  document.getElementById('m-name').textContent = name;
  document.getElementById('m-type').textContent = type === 'quantum'
    ? 'Payment Channel · Pay per Shot'
    : 'XRPL Escrow · Time-locked';
  document.getElementById('m-inst-id').value       = instrumentId  || '';
  document.getElementById('m-provider-addr').value = providerAddr  || '';

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

async function confirmBook() {
  const userId        = localStorage.getItem('quantum_user_id');
  const buyerAddress  = localStorage.getItem('quantum_user_xrpl');
  const seed          = getSessionSeed();
  const instrumentId  = document.getElementById('m-inst-id')?.value;
  const providerAddr  = document.getElementById('m-provider-addr')?.value;
  const dur           = parseInt(document.getElementById('m-dur').value) || 30;
  const priceXRP      = parseFloat((dur * _rate).toFixed(2));

  if (!userId)       return toast("❌ Non connecté.");
  if (!seed)         return toast("❌ Seed requis — reconnectez-vous.");
  if (!instrumentId) return toast("❌ Instrument introuvable.");
  if (!providerAddr) return toast("❌ Adresse du provider manquante.");

  document.getElementById('modal').style.display = 'none';
  toast("⏳ Soumission de la transaction XRPL...");

  try {
    // 1. Paiement via l'API Python (XRPL)
    const payRes = await fetch(`${XRPL_API_URL}/payment`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyer_seed:          seed,
        observatory_address: providerAddr,  // vraie adresse du provider
        units:               dur,
        date:                new Date().toISOString().split('T')[0],
        price_xrp_per_unit:  _rate,
        observatory_id:      instrumentId,
        currency:            'min',
      }),
    });
    const payData = await payRes.json();

    if (!payRes.ok) {
      toast("❌ Échec XRPL : " + (payData.error || "Erreur inconnue"));
      return;
    }

    toast("🔗 Transaction confirmée — enregistrement...");

    // 2. Crée la session en DB
    const sessRes = await fetch(`${API_URL}/sessions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        instrumentId,
        priceXRP,
        xrplTxHash: payData.tx_hash || null,
      }),
    });

    if (sessRes.ok) {
      toast("✓ Session réservée sur XRPL Testnet !");
      loadSessions();
      loadXRPLData();
    } else {
      toast("✓ TX confirmée — erreur d'enregistrement DB");
    }

  } catch (err) {
    console.error(err);
    toast("❌ Erreur de communication.");
  }
}

let _toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}