// =============================================
// main.js — initialisation générale
// =============================================
 
document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll pour les liens d'ancrage
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return; // ignorer les liens vides
      const target = document.querySelector(href);
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
 