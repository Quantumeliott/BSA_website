// =============================================
// QUANTUMGRID — Booking Modal Module
// Handles session reservation UI
// Hook confirmSession() to real XRPL Escrow/PayChan creation
// =============================================

let _currentRate = 0.48;
let _currentType = 'telescope'; // 'telescope' | 'quantum'
let _currentName = '';

/**
 * Open the booking modal for a given instrument.
 *
 * @param {string} name  - instrument display name
 * @param {string} rate  - XRP rate (per min for telescope, per shot for quantum)
 * @param {string} type  - 'telescope' | 'quantum'
 */
export function openModal(name, rate, type) {
  _currentName = name;
  _currentRate = parseFloat(rate);
  _currentType = type;

  document.getElementById('modal-instrument-name').textContent = name;

  const subText = type === 'quantum'
    ? 'Open Payment Channel · Pay per Shot · Trustless'
    : 'Create XRPL Escrow · Time-locked · Trustless';
  document.getElementById('modal-sub').textContent = subText;

  _updateCost();
  document.getElementById('modal-overlay').classList.add('open');
}

/**
 * Close modal on overlay click.
 */
export function closeModal(event) {
  // Only close if clicking the overlay itself, not its children
  if (event.target === document.getElementById('modal-overlay')) {
    document.getElementById('modal-overlay').classList.remove('open');
  }
}

/**
 * Confirm and submit the session booking.
 * TODO: replace alert() with real XRPL transaction calls from xrpl.js
 */
export function confirmSession() {
  const duration = parseInt(document.getElementById('modal-duration').value) || 30;
  const cost     = (duration * _currentRate).toFixed(2);

  document.getElementById('modal-overlay').classList.remove('open');

  // --- HOOK: Replace this block with your XRPL Escrow/PayChan creation ---
  // import { createEscrow } from '../xrpl/escrow.js'
  // import { openPaymentChannel } from '../xrpl/paymentChannel.js'
  //
  // if (_currentType === 'telescope') {
  //   await createEscrow({ instrument: _currentName, durationMin: duration, xrpAmount: cost });
  // } else {
  //   await openPaymentChannel({ instrument: _currentName, budgetXRP: cost, ratePerShot: _currentRate });
  // }
  // -----------------------------------------------------------------------

  alert(`🔗 ${_currentType === 'quantum' ? 'Payment Channel' : 'Escrow'} submitted to XRPL Testnet.\nInstrument: ${_currentName}\nAmount locked: ${cost} XRP`);
}

/**
 * Recompute and display the estimated cost whenever duration changes.
 */
function _updateCost() {
  const dur  = parseInt(document.getElementById('modal-duration').value) || 30;
  const cost = (dur * _currentRate).toFixed(2);
  document.getElementById('modal-cost').textContent = cost + ' XRP';
}

/** Bind input listener — call once after DOM is ready */
export function initModal() {
  document.getElementById('modal-duration').addEventListener('input', _updateCost);
}
