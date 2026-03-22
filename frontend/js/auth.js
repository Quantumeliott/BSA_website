// =============================================
// auth.js — authentification + settings
// =============================================

async function handleRegister() {
  const name     = document.getElementById('reg-name').value;
  const email    = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const role     = 'RESEARCHER';

  if (!name || !email || !password) return toast("Champs obligatoires manquants !");

  toast("Création de votre profil...");

  try {
    const res  = await fetch(`${API_URL}/users`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, name, role }),
    });
    const data = await res.json();

    if (res.ok) {
      toast("Bienvenue ! Connectez-vous maintenant.");
      switchTab('login');
    } else {
      toast("Erreur: " + (data.error || "Inscription impossible"));
    }
  } catch {
    toast("Le serveur ne répond pas.");
  }
}

async function handleLogin() {
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  if (!email || !password) return toast("Email et mot de passe requis");

  toast("Vérification des identifiants...");

  try {
    const res  = await fetch(`${API_URL}/users/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (res.ok) {
      toast("Connexion réussie ! 🚀");
      localStorage.setItem('quantum_user_id', data.id);
      if (data.xrplAddress) localStorage.setItem('quantum_user', data.xrplAddress);
      showPage('dashboard');
      showDP('overview');
      loadSettings(data); // pré-remplir les settings
    } else {
      toast("❌ Erreur : " + (data.error || "Identifiants incorrects"));
    }
  } catch (err) {
    console.error(err);
    toast("Erreur de communication avec le serveur.");
  }
}

function walletLogin() {
  handleLogin();
}

function logout() {
  localStorage.removeItem('quantum_user');
  localStorage.removeItem('quantum_user_id');
  showPage('landing');
  toast("Déconnecté.");
}

// ---- Settings ----

// Pré-remplit les champs avec les données de l'utilisateur
function loadSettings(user) {
  if (!user) return;
  const name = document.getElementById('settings-name');
  const email = document.getElementById('settings-email');
  const xrpl  = document.getElementById('settings-xrpl');
  if (name  && user.name)        name.value  = user.name;
  if (email && user.email)       email.value = user.email;
  if (xrpl  && user.xrplAddress) xrpl.value  = user.xrplAddress;
}

// Sauvegarde les settings via API
async function saveSettings() {
  const userId = localStorage.getItem('quantum_user_id');
  if (!userId) return toast("Non connecté.");

  const name  = document.getElementById('settings-name')?.value;
  const email = document.getElementById('settings-email')?.value;
  const xrpl  = document.getElementById('settings-xrpl')?.value;

  toast("Sauvegarde...");

  try {
    const res = await fetch(`${API_URL}/users/${userId}`, {
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
  } catch {
    toast("Le serveur ne répond pas.");
  }
}

// Recharge les settings si déjà connecté (après refresh)
document.addEventListener('DOMContentLoaded', async () => {
  const userId = localStorage.getItem('quantum_user_id');
  if (!userId) return;

  try {
    const res = await fetch(`${API_URL}/users/${userId}`);
    if (res.ok) {
      const user = await res.json();
      loadSettings(user);
    }
  } catch { /* silencieux */ }
});