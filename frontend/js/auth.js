// =============================================
// auth.js — authentification + settings + xrpl
// =============================================

let _sessionSeed = null;
function getSessionSeed()  { return _sessionSeed; }
function clearSessionSeed() { _sessionSeed = null; }

// =============================================
// INSCRIPTION
// =============================================
async function handleRegister() {
  const name     = document.getElementById('reg-name').value;
  const email    = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  if (!name || !email || !password) return toast("Champs obligatoires manquants !");
  toast("⏳ Génération de votre wallet XRPL...");

  try {
    // 1. Génère le wallet XRPL
    const walletRes  = await fetch(`${XRPL_API_URL}/new_wallet`);
    const walletData = await walletRes.json();

    toast("🔗 Wallet créé — enregistrement du compte...");

    // 2. Crée le compte en DB avec l'adresse XRPL
    const res  = await fetch(`${API_URL}/users`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, name, role: 'RESEARCHER', xrplAddress: walletData.address }),
    });
    const data = await res.json();

    if (res.ok) {
      // 3. Affiche le seed une seule fois
      showSeedModal(walletData.address, walletData.seed);
    } else {
      toast("Erreur: " + (data.error || "Inscription impossible"));
    }
  } catch (err) {
    console.error(err);
    toast("Le serveur ne répond pas.");
  }
}

function showSeedModal(address, seed) {
  document.getElementById('new-wallet-address').textContent = address;
  document.getElementById('new-wallet-seed').textContent    = seed;
  document.getElementById('seed-modal').style.display = 'flex';
}

function confirmSeedSaved() {
  document.getElementById('seed-modal').style.display = 'none';
  toast("Bienvenue ! Connectez-vous maintenant.");
  switchTab('login');
}

// =============================================
// CONNEXION
// =============================================
async function handleLogin() {
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const seed     = document.getElementById('login-seed')?.value?.trim();

  if (!email || !password) return toast("Email et mot de passe requis");
  if (!seed) return toast("Seed phrase requise");
  toast("Vérification...");

  try {
    const res  = await fetch(`${API_URL}/users/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('quantum_user_id',    data.id);
      localStorage.setItem('quantum_user_name',  data.name        || '');
      localStorage.setItem('quantum_user_email', data.email       || email);
      localStorage.setItem('quantum_user_xrpl',  data.xrplAddress || '');

      _sessionSeed = seed;
      toast("Connexion réussie ! 🚀");
      showPage('dashboard');
      showDP('overview');
      // fetchAndLoadProfile gère loadSettings + loadXRPLData
      fetchAndLoadProfile();
      loadSessions();
    } else {
      toast("❌ " + (data.error || "Identifiants incorrects"));
    }
  } catch (err) {
    console.error(err);
    toast("Erreur de communication.");
  }
}

function walletLogin() { handleLogin(); }

function logout() {
  clearSessionSeed();
  ['quantum_user_id','quantum_user_name','quantum_user_email','quantum_user_xrpl','quantum_user_createdat']
    .forEach(k => localStorage.removeItem(k));
  showPage('landing');
  toast("Déconnecté.");
}

// =============================================
// XRPL — balance + NFTs depuis l'API Python
// =============================================
async function loadXRPLData() {
  const xrpl = localStorage.getItem('quantum_user_xrpl');
  if (!xrpl) return;

  try {
    const res  = await fetch(`${XRPL_API_URL}/users_infos/${xrpl}`);
    if (!res.ok) return;
    const data = await res.json();

    const balance = data.balance_xrp ?? 0;
    const usd     = (balance * 0.57).toFixed(2); // prix approx XRP

    // Mise à jour partout
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('nav-balance',    balance.toFixed(2));
    set('ov-balance',     balance.toFixed(2));
    set('ov-usd',         `≈ $${usd} USD`);
    set('wallet-balance', balance.toFixed(2));
    set('wallet-usd',     `≈ $${usd} USD`);
    set('wallet-addr-display', xrpl);
    set('sidebar-addr',   xrpl.slice(0,6) + '...' + xrpl.slice(-4));

    // Mise à jour transactions wallet depuis les sessions
    loadWalletTx();

  } catch (err) {
    console.warn('[XRPL] Impossible de charger la balance:', err);
  }
}

// =============================================
// WALLET — historique des transactions depuis sessions DB
// =============================================
async function loadWalletTx() {
  const userId = localStorage.getItem('quantum_user_id');
  const tbody  = document.getElementById('wallet-tx-tbody');
  if (!userId || !tbody) return;

  try {
    const res  = await fetch(`${API_URL}/sessions?userId=${userId}`);
    if (!res.ok) return;
    const data = await res.json();
    const sessions = data.sessions ?? [];

    if (!sessions.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:20px;font-size:11px;">No transactions yet</td></tr>';
      return;
    }

    tbody.innerHTML = sessions.map(s => {
      const hash  = s.xrplTxHash ? s.xrplTxHash.slice(0,6) + '...' + s.xrplTxHash.slice(-4) : '—';
      const date  = new Date(s.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
      const price = '−' + (s.priceXRP || 0).toFixed(2) + ' XRP';
      const counterparty = s.instrument?.name ? s.instrument.name.slice(0,12) + '...' : '—';
      return `<tr>
        <td><span class="pill pill-o">Escrow Lock</span></td>
        <td style="color:var(--orange)">${price}</td>
        <td style="font-size:10px;color:var(--text-dim)">${counterparty}</td>
        <td>${date}</td>
        <td style="color:var(--cyan);font-size:10px">${hash}</td>
      </tr>`;
    }).join('');

  } catch (err) {
    console.warn('[wallet-tx] Erreur:', err);
  }
}

// =============================================
// SETTINGS
// =============================================
async function fetchAndLoadProfile() {
  const id = localStorage.getItem('quantum_user_id');
  if (!id) return;
  try {
    const res = await fetch(`${API_URL}/users/id/${id}`);
    if (res.ok) {
      const user = await res.json();
      localStorage.setItem('quantum_user_name',      user.name        || '');
      localStorage.setItem('quantum_user_email',     user.email       || '');
      localStorage.setItem('quantum_user_xrpl',      user.xrplAddress || '');
      localStorage.setItem('quantum_user_createdat', user.createdAt   || '');
      loadSettings();
      loadXRPLData(); // recharge avec la bonne adresse
    }
  } catch { /* silencieux */ }
}

function loadSettings() {
  const n = document.getElementById('settings-name');
  const e = document.getElementById('settings-email');
  const x = document.getElementById('settings-xrpl');
  if (n) n.value = localStorage.getItem('quantum_user_name')  || '';
  if (e) e.value = localStorage.getItem('quantum_user_email') || '';
  if (x) x.value = localStorage.getItem('quantum_user_xrpl')  || '';
  const d = document.getElementById('settings-createdat');
  if (d) {
    const raw = localStorage.getItem('quantum_user_createdat');
    d.value = raw ? new Date(raw).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }) : '—';
  }
}

async function saveSettings() {
  const id    = localStorage.getItem('quantum_user_id');
  const name  = document.getElementById('settings-name')?.value;
  const email = document.getElementById('settings-email')?.value;
  const xrpl  = document.getElementById('settings-xrpl')?.value;
  if (!id) return toast("Non connecté.");
  toast("Sauvegarde...");
  try {
    const target = xrpl || id;
    const res = await fetch(`${API_URL}/users/${target}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, xrplAddress: xrpl }),
    });
    if (res.ok) {
      localStorage.setItem('quantum_user_name',  name  || '');
      localStorage.setItem('quantum_user_email', email || '');
      localStorage.setItem('quantum_user_xrpl',  xrpl  || '');
      loadSettings();
      loadXRPLData();
      toast("✓ Profil mis à jour !");
    } else {
      const data = await res.json();
      toast("Erreur : " + (data.error || "Mise à jour impossible"));
    }
  } catch { toast("Le serveur ne répond pas."); }
}

function copyAddr() {
  const addr = localStorage.getItem('quantum_user_xrpl') || '';
  navigator.clipboard.writeText(addr)
    .then(()  => toast('Adresse copiée !'))
    .catch(()  => toast('Échec de la copie'));
}

// Au refresh
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('quantum_user_id')) {
    loadSettings();
    fetchAndLoadProfile();
  }
});