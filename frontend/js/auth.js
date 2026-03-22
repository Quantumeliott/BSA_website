// =============================================
// auth.js — authentification + settings
// =============================================

// Seed en mémoire uniquement — jamais stocké, effacé au refresh
let _sessionSeed = null;

function getSessionSeed() { return _sessionSeed; }
function clearSessionSeed() { _sessionSeed = null; }

async function handleRegister() {
  const name     = document.getElementById('reg-name').value;
  const email    = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  if (!name || !email || !password) return toast("Champs obligatoires manquants !");
  toast("Création de votre profil...");

  try {
    const res  = await fetch(`${API_URL}/users`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, name, role: 'RESEARCHER' }),
    });
    const data = await res.json();
    if (res.ok) { toast("Bienvenue ! Connectez-vous."); switchTab('login'); }
    else toast("Erreur: " + (data.error || "Inscription impossible"));
  } catch { toast("Le serveur ne répond pas."); }
}

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
      localStorage.setItem('quantum_user_id', data.id);
      // Stocke les infos du login, puis enrichit depuis /users/id/:id
      localStorage.setItem('quantum_user_name',  data.name        || '');
      localStorage.setItem('quantum_user_email', data.email       || email);
      localStorage.setItem('quantum_user_xrpl',  data.xrplAddress || '');

      _sessionSeed = seed; // stocké en mémoire uniquement
      toast("Connexion réussie ! 🚀");
      showPage('dashboard');
      showDP('overview');
      loadSettings();
      fetchAndLoadProfile(); // enrichit les settings depuis la DB
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
  clearSessionSeed(); // efface le seed de la mémoire
  ['quantum_user_id','quantum_user_name','quantum_user_email','quantum_user_xrpl','quantum_user_createdat']
    .forEach(k => localStorage.removeItem(k));
  showPage('landing');
  toast("Déconnecté.");
}

// ---- Charge le profil depuis GET /users/id/:id ----
async function fetchAndLoadProfile() {
  const id = localStorage.getItem('quantum_user_id');
  if (!id) return;

  try {
    const res = await fetch(`${API_URL}/users/id/${id}`); // route correcte
    if (res.ok) {
      const user = await res.json();
      // Met à jour localStorage avec les vraies données DB
      localStorage.setItem('quantum_user_name',      user.name        || '');
      localStorage.setItem('quantum_user_email',     user.email       || '');
      localStorage.setItem('quantum_user_xrpl',      user.xrplAddress || '');
      localStorage.setItem('quantum_user_createdat', user.createdAt   || '');
      loadSettings();
    }
  } catch { /* silencieux */ }
}

// ---- Remplit les champs settings ----
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

// ---- Sauvegarde via PATCH /users/:xrplAddress ----
async function saveSettings() {
  const id    = localStorage.getItem('quantum_user_id');
  const name  = document.getElementById('settings-name')?.value;
  const email = document.getElementById('settings-email')?.value;
  const xrpl  = document.getElementById('settings-xrpl')?.value;

  if (!id) return toast("Non connecté.");
  toast("Sauvegarde...");

  try {
    // On utilise l'xrpl si dispo, sinon on essaie par id
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
      toast("✓ Profil mis à jour !");
    } else {
      const data = await res.json();
      toast("Erreur : " + (data.error || "Mise à jour impossible"));
    }
  } catch { toast("Le serveur ne répond pas."); }
}

// ---- Au refresh : recharge depuis localStorage puis DB ----
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('quantum_user_id')) {
    loadSettings();       // affiche ce qu'on a immédiatement
    fetchAndLoadProfile(); // puis enrichit depuis la DB
  }
});