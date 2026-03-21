// =============================================
// QUANTUMGRID — XRPL Payment Channel Module
// For quantum computer pay-per-shot billing
// =============================================

import * as xrpl from 'xrpl';

const XRPL_NODE = 'wss://s.altnet.rippletest.net:51233'; // Testnet

let _client = null;

async function getClient() {
  if (!_client) {
    _client = new xrpl.Client(XRPL_NODE);
    await _client.connect();
  }
  return _client;
}

/**
 * Open a Payment Channel from user to provider.
 * Called once at the beginning of a quantum session.
 *
 * @param {object} params
 * @param {xrpl.Wallet} params.userWallet       - User's wallet
 * @param {string}  params.providerAddress      - Provider's XRPL address
 * @param {number}  params.budgetXRP            - Max XRP budget to lock
 * @param {number}  params.settleDelaySeconds   - How long provider has to claim after close
 *
 * @returns {{ txHash: string, channelId: string }}
 */
export async function openPaymentChannel({
  userWallet,
  providerAddress,
  budgetXRP,
  settleDelaySeconds = 86400, // 24h default
}) {
  const client = await getClient();

  const tx = {
    TransactionType:  'PaymentChannelCreate',
    Account:          userWallet.address,
    Destination:      providerAddress,
    Amount:           xrpl.xrpToDrops(budgetXRP),
    SettleDelay:      settleDelaySeconds,
    PublicKey:        userWallet.publicKey,
    Memos: [{
      Memo: {
        MemoType: Buffer.from('quantumgrid/quantum-session', 'utf8').toString('hex').toUpperCase(),
      }
    }],
  };

  const prepared = await client.autofill(tx);
  const signed   = userWallet.sign(prepared);
  const result   = await client.submitAndWait(signed.tx_blob);

  if (result.result.meta.TransactionResult !== 'tesSUCCESS') {
    throw new Error(`PaymentChannel open failed: ${result.result.meta.TransactionResult}`);
  }

  // Extract channel ID from metadata
  const channelNode = result.result.meta.AffectedNodes
    .find(n => n.CreatedNode?.LedgerEntryType === 'PayChannel');
  const channelId = channelNode?.CreatedNode?.LedgerIndex;

  console.log('[PayChan] Opened:', channelId);
  return { txHash: signed.hash, channelId };
}

/**
 * Sign an off-chain claim for a given cumulative amount.
 * Called client-side after EACH quantum shot is delivered.
 *
 * @param {xrpl.Wallet} userWallet
 * @param {string}  channelId     - Channel ID from openPaymentChannel
 * @param {number}  cumulativeXRP - Total XRP owed so far (must be strictly increasing)
 *
 * @returns {string} Signed claim (hex) — send this to provider
 */
export function signClaim(userWallet, channelId, cumulativeXRP) {
  const drops = xrpl.xrpToDrops(cumulativeXRP);
  const claim  = xrpl.signPaymentChannelClaim(channelId, drops, userWallet.privateKey);
  console.log(`[PayChan] Claim signed: ${cumulativeXRP} XRP`);
  return claim;
}

/**
 * Provider calls this to claim their earnings on-chain.
 * Can be called once at end, or periodically to batch.
 *
 * @param {xrpl.Wallet} providerWallet
 * @param {string}  channelId
 * @param {string}  userAddress
 * @param {number}  cumulativeXRP
 * @param {string}  signedClaim    - From signClaim() above
 */
export async function claimPayment({
  providerWallet,
  channelId,
  userAddress,
  cumulativeXRP,
  signedClaim,
}) {
  const client = await getClient();
  const drops  = xrpl.xrpToDrops(cumulativeXRP);

  const tx = {
    TransactionType: 'PaymentChannelClaim',
    Account:         providerWallet.address,
    Channel:         channelId,
    Balance:         drops,
    Amount:          drops,
    Signature:       signedClaim,
    PublicKey:       (await client.request({
      command:  'account_channels',
      account:  userAddress,
      destination_account: providerWallet.address,
    })).result.channels.find(c => c.channel_id === channelId)?.public_key,
  };

  const prepared = await client.autofill(tx);
  const signed   = providerWallet.sign(prepared);
  const result   = await client.submitAndWait(signed.tx_blob);

  console.log('[PayChan] Claimed:', cumulativeXRP, 'XRP, tx:', signed.hash);
  return signed.hash;
}

/**
 * User requests channel closure after session ends.
 * Provider has SettleDelay seconds to submit their final claim.
 *
 * @param {xrpl.Wallet} userWallet
 * @param {string}  channelId
 */
export async function requestChannelClose({ userWallet, channelId }) {
  const client = await getClient();

  const tx = {
    TransactionType: 'PaymentChannelClaim',
    Account:         userWallet.address,
    Channel:         channelId,
    Flags:           xrpl.PaymentChannelClaimFlags.tfClose,
  };

  const prepared = await client.autofill(tx);
  const signed   = userWallet.sign(prepared);
  await client.submitAndWait(signed.tx_blob);

  console.log('[PayChan] Close requested for:', channelId);
}
