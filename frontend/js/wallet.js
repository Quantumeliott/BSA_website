// =============================================
// QUANTUMGRID — Wallet Connection Module
// Supports XUMM & Crossmark wallets
// =============================================

let _connectedAddress = null;

/**
 * Returns the currently connected XRPL address, or null.
 */
export function getAddress() {
  return _connectedAddress;
}

/**
 * Connect wallet — tries Crossmark first, falls back to XUMM.
 * Updates the nav button text on success.
 */
export async function connectWallet() {
  const btn = document.querySelector('.nav-cta');

  try {
    // --- Try Crossmark (browser extension) ---
    if (window.crossmark) {
      const res = await window.crossmark.signInAndWait();
      if (res?.response?.data?.address) {
        _onConnected(res.response.data.address, btn);
        return;
      }
    }

    // --- Try XUMM (deep link / QR) ---
    if (window.xumm) {
      const xumm = new window.xumm.Xumm(process.env.XUMM_API_KEY || '');
      await xumm.authorize();
      const account = await xumm.user.account;
      if (account) {
        _onConnected(account, btn);
        return;
      }
    }

    // --- Fallback: prompt for address (dev mode) ---
    const addr = prompt('Enter your XRPL address (dev mode):');
    if (addr && addr.startsWith('r')) {
      _onConnected(addr, btn);
      return;
    }

    throw new Error('No wallet found. Install Crossmark or XUMM.');

  } catch (err) {
    console.error('[Wallet] Connection failed:', err);
    alert('⚠️ Wallet connection failed: ' + err.message);
  }
}

function _onConnected(address, btn) {
  _connectedAddress = address;
  const short = address.slice(0, 6) + '...' + address.slice(-4);
  btn.textContent = short;
  btn.style.background = '#fff';
  console.log('[Wallet] Connected:', address);
}
