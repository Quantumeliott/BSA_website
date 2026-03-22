// =============================================
// auth.js — authentification + settings
// =============================================

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

  if (!email || !password) return toast("Email et mot de passe requis");
  toast("Vérification...");

  try {
    const res  = await fetch(`${API_URL}/users/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('quantum_user_id', data.id); // on stocke juste l'ID
      toast("Connexion réussie ! 🚀");
      showPage('dashboard');
      showDP('overview');
      await fetchAndLoadProfile(); // on charge le profil depuis la DB
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
  localStorage.removeItem('quantum_user_id');
  showPage('landing');
  toast("Déconnecté.");
}

// ---- Charge le profil depuis la DB par ID ----
async function fetchAndLoadProfile() {
  const id = localStorage.getItem('quantum_user_id');
  if (!id) return;

  try {
    const res = await fetch(`${API_URL}/users/${id}`);
    if (res.ok) {
      const user = await res.json();
      loadSettings(user);
    }
  } catch { /* silencieux */ }
}

// ---- Remplit les champs settings ----
function loadSettings(user) {
  if (!user) return;
  const n = document.getElementById('settings-name');
  const e = document.getElementById('settings-email');
  const x = document.getElementById('settings-xrpl');
  if (n) n.value = user.name        || '';
  if (e) e.value = user.email       || '';
  if (x) x.value = user.xrplAddress || '';
}

// ---- Sauvegarde via PATCH /users/:id ----
async function saveSettings() {
  const id = localStorage.getItem('quantum_user_id');
  if (!id) return toast("Non connecté.");

  const name  = document.getElementById('settings-name')?.value;
  const email = document.getElementById('settings-email')?.value;
  const xrpl  = document.getElementById('settings-xrpl')?.value;

  toast("Sauvegarde...");

  try {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, xrplAddress: xrpl }),
    });
    if (res.ok) toast("✓ Profil mis à jour !");
    else {
      const data = await res.json();
      toast("Erreur : " + (data.error || "Mise à jour impossible"));
    }
  } catch { toast("Le serveur ne répond pas."); }
}

// ---- Au refresh : recharge le profil si connecté ----
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('quantum_user_id')) fetchAndLoadProfile();
});