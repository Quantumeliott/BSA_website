// =============================================
// auth.js — authentification
// =============================================
 
async function handleRegister() {
  const name     = document.getElementById('reg-name').value;
  const email    = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const role     = 'RESEARCHER';
 
  if (!name || !email || !password) return toast("Champs obligatoires manquants !");
 
  toast("Création de votre profil...");
 
  try {
    const res = await fetch(`${API_URL}/users`, {
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
    const res = await fetch(`${API_URL}/users/login`, {
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
 