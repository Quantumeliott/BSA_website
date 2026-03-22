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
      // Stocke ce qu'on a besoin pour les prochaines requêtes
      localStorage.setItem('quantum_user_id',   data.id);
      localStorage.setItem('quantum_user_email', data.email || email);
      if (data.xrplAddress) localStorage.setItem('quantum_user', data.xrplAddress);

      toast("Connexion réussie ! 🚀");
      showPage('dashboard');
      showDP('overview');
      loadSettings(data);
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
  localStorage.removeItem('quantum_user');
  localStorage.removeItem('quantum_user_id');
  localStorage.removeItem('quantum_user_email');
  showPage('landing');
  toast("Déconnecté.");
}

// ---- Settings ----

function loadSettings(user) {
  if (!user) return;
  const n = document.getElementById('settings-name');
  const e = document.getElementById('settings-email');
  const x = document.getElementById('settings-xrpl');
  if (n && user.name)        n.value = user.name;
  if (e && user.email)       e.value = user.email;
  if (x && user.xrplAddress) x.value = user.xrplAddress;
}

async function saveSettings() {
  const xrplAddress = localStorage.getItem('quantum_user');
  if (!xrplAddress) return toast("Non connecté.");

  const name  = document.getElementById('settings-name')?.value;
  const email = document.getElementById('settings-email')?.value;
  const xrpl  = document.getElementById('settings-xrpl')?.value;

  toast("Sauvegarde...");

  try {
    // PATCH /users/:xrplAddress — endpoint déjà existant dans le backend
    const res = await fetch(`${API_URL}/users/${xrplAddress}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, xrplAddress: xrpl }),
    });

    if (res.ok) {
      if (xrpl) localStorage.setItem('quantum_user', xrpl);
      toast("✓ Profil mis à jour !");
    } else {
      const data = await res.json();
      toast("Erreur : " + (data.error || "Mise à jour impossible"));
    }
  } catch { toast("Le serveur ne répond pas."); }
}

// Au refresh : recharge le profil depuis GET /users/:xrplAddress
document.addEventListener('DOMContentLoaded', async () => {
  const xrplAddress = localStorage.getItem('quantum_user');
  if (!xrplAddress) return;

  try {
    const res = await fetch(`${API_URL}/users/${xrplAddress}`);
    if (res.ok) loadSettings(await res.json());
  } catch { /* silencieux */ }
});