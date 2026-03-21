// =============================================
// QUANTUMGRID — Main Entry Point
// =============================================

import { startSession }           from './session.js';
import { initModal, openModal,
         closeModal, confirmSession } from './modal.js';
import { connectWallet }          from './wallet.js';

// Expose to inline HTML onclick handlers
window.openModal      = openModal;
window.closeModal     = closeModal;
window.confirmSession = confirmSession;

document.addEventListener('DOMContentLoaded', () => {
  // Start live session ticker
  startSession();

  // Init modal input binding
  initModal();

  // Wallet connect button
  document.querySelector('.nav-cta')
    .addEventListener('click', connectWallet);

  // Smooth scroll for nav
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });
});
