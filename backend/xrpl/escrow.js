// =============================================
// QUANTUMGRID — XRPL Escrow Module
// For telescope time-slot bookings
// Uses native XRPL EscrowCreate / EscrowFinish
// =============================================

import * as xrpl from 'xrpl';

const XRPL_NODE    = 'wss://s.altnet.rippletest.net:51233'; // Testnet
const ORACLE_ADDR  = process.env.ORACLE_ADDRESS;            // Oracle wallet address

let _client = null;

async function getClient() {
  if (!_client) {
    _client = new xrpl.Client(XRPL_NODE);
    await _client.connect();
  }
  return _client;
}

/**
 * Create a time-locked Escrow for a telescope session.
 *
 * @param {object} params
 * @param {string} params.senderWallet      - xrpl.Wallet of the user
 * @param {string} params.providerAddress   - XRPL address of the telescope provider
 * @param {number} params.xrpAmount         - Amount to lock in XRP
 * @param {number} params.durationSeconds   - Session duration in seconds
 * @param {string} params.conditionHex      - BLAKE2b condition hex (provided by oracle)
 *
 * @returns {string} Transaction hash of the EscrowCreate
 */
export async function createEscrow({
  senderWallet,
  providerAddress,
  xrpAmount,
  durationSeconds,
  conditionHex,
}) {
  const client    = await getClient();
  const finishAfter = xrpl.unixTimeToRippleTime(Date.now() / 1000 + durationSeconds);
  const cancelAfter = xrpl.unixTimeToRippleTime(Date.now() / 1000 + durationSeconds + 3600); // +1h grace

  const tx = {
    TransactionType: 'EscrowCreate',
    Account:         senderWallet.address,
    Destination:     providerAddress,
    Amount:          xrpl.xrpToDrops(xrpAmount),
    FinishAfter:     finishAfter,
    CancelAfter:     cancelAfter,
    Condition:       conditionHex,   // PREIMAGE-SHA-256 condition from oracle
    Memos: [{
      Memo: {
        MemoType: Buffer.from('quantumgrid/session', 'utf8').toString('hex').toUpperCase(),
        MemoData: Buffer.from(JSON.stringify({ provider: providerAddress, duration: durationSeconds }), 'utf8')
          .toString('hex').toUpperCase(),
      }
    }],
  };

  const prepared = await client.autofill(tx);
  const signed   = senderWallet.sign(prepared);
  const result   = await client.submitAndWait(signed.tx_blob);

  if (result.result.meta.TransactionResult !== 'tesSUCCESS') {
    throw new Error(`Escrow creation failed: ${result.result.meta.TransactionResult}`);
  }

  console.log('[Escrow] Created:', signed.hash);
  return signed.hash;
}

/**
 * Finish (release) an Escrow after session delivery.
 * Called by the oracle after it validates session completion.
 *
 * @param {object} params
 * @param {xrpl.Wallet} params.providerWallet - Provider's wallet
 * @param {string}  params.ownerAddress       - User's XRPL address
 * @param {number}  params.offerSequence      - Sequence of the EscrowCreate tx
 * @param {string}  params.conditionHex       - Condition hex
 * @param {string}  params.fulfillmentHex     - Fulfillment (preimage) hex from oracle
 */
export async function finishEscrow({
  providerWallet,
  ownerAddress,
  offerSequence,
  conditionHex,
  fulfillmentHex,
}) {
  const client = await getClient();

  const tx = {
    TransactionType: 'EscrowFinish',
    Account:         providerWallet.address,
    Owner:           ownerAddress,
    OfferSequence:   offerSequence,
    Condition:       conditionHex,
    Fulfillment:     fulfillmentHex,
  };

  const prepared = await client.autofill(tx);
  const signed   = providerWallet.sign(prepared);
  const result   = await client.submitAndWait(signed.tx_blob);

  if (result.result.meta.TransactionResult !== 'tesSUCCESS') {
    throw new Error(`Escrow finish failed: ${result.result.meta.TransactionResult}`);
  }

  console.log('[Escrow] Released:', signed.hash);
  return signed.hash;
}

/**
 * Cancel an Escrow after CancelAfter time if provider never delivered.
 *
 * @param {xrpl.Wallet} userWallet
 * @param {string}  ownerAddress
 * @param {number}  offerSequence
 */
export async function cancelEscrow({ userWallet, ownerAddress, offerSequence }) {
  const client = await getClient();

  const tx = {
    TransactionType: 'EscrowCancel',
    Account:         userWallet.address,
    Owner:           ownerAddress,
    OfferSequence:   offerSequence,
  };

  const prepared = await client.autofill(tx);
  const signed   = userWallet.sign(prepared);
  const result   = await client.submitAndWait(signed.tx_blob);

  console.log('[Escrow] Cancelled:', signed.hash);
  return signed.hash;
}
