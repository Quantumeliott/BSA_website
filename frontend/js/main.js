// =============================================
// main.js — initialisation générale
// =============================================
 
document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll pour les liens d'ancrage
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
 
  // Bouton Connect Wallet dans la nav du dashboard
  const navCta = document.querySelector('.nav-cta');
  if (navCta) navCta.addEventListener('click', () => showAuth('login'));
});