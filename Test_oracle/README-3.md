# QuantumGrid / TelescopeGrid

**DePIN Oracle — XRPL + Qiskit + IBM Quantum**

Hackathon 2026 · EPFL · Brieuc Jubert

---

## Vision

OpenGate is a decentralized marketplace (DePIN) that allows a researcher to pay a resource provider (quantum computing or telescope time) in a completely trustless way on the XRPL ledger.

The oracle acts as a cryptographic judge: it only releases the payment after verifying that the service has been delivered. Neither can the provider take the money without delivering, nor can the researcher refuse to pay after delivery.

---

## Architecture

### 3 actors

- **Researcher (client)** — submits a request and locks the payment in an XRPL escrow
- **Provider (CERN)** — executes the service (quantum computing or telescope observation)
- **Oracle** — verifies delivery and reveals the fulfillment to release the payment

### Payment flow

```
Chercheur → EscrowCreate (XRP verrouillés)
Oracle    → détecte l'escrow → exécute → vérifie
Oracle    → EscrowFinish (fulfillment révélé) → XRP libérés
Oracle    → Payment → 90% au fournisseur, 10% commission
```

### Cryptographic mechanism

Each job uses a **PREIMAGE-SHA-256** condition (XRPL ASN.1 format). The oracle generates a random secret (preimage), computes the public condition and puts it in the escrow. The preimage is only revealed after verifying delivery — that is the trustless guarantee.

---

## Available services

### Quantum (`bridge.py`)

The researcher submits a QASM circuit. The oracle executes it on Qiskit Aer (simulator) or IBM Quantum (real hardware). The result is published on-chain in the EscrowFinish memos with the IBM verification URL.

- Bell State circuit by default (2 qubits, quantum entanglement)
- Compatible with IBM Quantum via qiskit-ibm-runtime 0.43+
- IBM verification: DONE status + counts consistency

### Telescope (`bridge_tele.py`)

The researcher controls an interactive telescope in the terminal (curses), points 3 targets using arrow keys, and validates. The RA/Dec coordinates are sent to the operator who photographs and delivers the FITS images.

- Terminal interface with a starry sky map
- 10 famous objects: Orion Nebula, Andromeda Galaxy, Pleiades...
- Verification: integrity hash of each image

---

## Getting started

### Prerequisites

```bash
pip install -r requirements.txt
cp .env.example .env  
```

### Commands

**Terminal — Submit a quantum request:**
```bash
python3 client.py quantum \
  --client   r9tHfqy8mFm3VsG341jJNFBk1W8JgHkDJR \
  --provider rBDc2z234zgDSqHPf9z8Ayw6ufpauDhWpx \
  --amount   1.0
```

**Terminal — Submit a telescope observation:**
```bash
python3 client.py telescope \
  --client   r9tHfqy8mFm3VsG341jJNFBk1W8JgHkDJR \
  --provider rBDc2z234zgDSqHPf9z8Ayw6ufpauDhWpx \
  --amount   1.0
```

### Mode with oracle2 and bridge2 (all-in-one)

**Terminal 1 — Oracle server (keep running):**
```bash
python3 oracle2.py
```

**Terminal 2 — submit bridge2:**
```bash
python3 .py
```

### Timeout scenario demo (failure protection)

```bash
python3 demo_timeout.py
```

Simulates IBM not responding: escrow created with a 30s TTL, monitor detects expiration and cancels automatically. The money is returned to the researcher.

---

## File structure

| File | Role |
|---|---|
| `client.py` | Unified entry point — chooses quantum or telescope, passes addresses |
| `bridge.py` | Full quantum computing flow: NFT → escrow → Qiskit/IBM → payment |
| `bridge_tele.py` | Full telescope flow: curses controller → NFT → escrow → images → payment |
| `oracle.py` | Standalone server — listens to XRPL ledger and processes jobs |
| `oracle2.py` | Improved oracle with pay_provider + result NFT integrated |
| `xrpl_client.py` | EscrowCreate, EscrowFinish, EscrowCancel, Payment |
| `crypto_condition.py` | PREIMAGE-SHA-256 ASN.1 generation — condition + fulfillment |
| `quantum_executor.py` | Qiskit Aer or IBM Quantum execution + IBM verification |
| `escrow_monitor.py` | Monitors TTLs — automatically cancels expired escrows |
| `demo_timeout.py` | IBM failure scenario demo — automatic protection |
| `test_e2e.py` | End-to-end test of the full oracle flow |
| `src/nft.py` | mint_slot, buy_and_certify, buy_slot — XRPL NFTs (partner code) |
| `src/wallets.py` | create_wallet, get_wallet — wallet management (partner code) |

---

## Configuration (.env)

| Variable | Description |
|---|---|
| `ORACLE_WALLET_SEED` | Oracle wallet seed **(required)** |
| `ORACLE_ADDRESS` | Oracle public address |
| `XRPL_WS_URL` | XRPL testnet WebSocket (default: altnet) |
| `USE_SIMULATOR` | `true` = local Qiskit, `false` = real IBM |
| `IBM_QUANTUM_TOKEN` | IBM Cloud Quantum API key |
| `IBM_QUANTUM_INSTANCE` | IBM Cloud instance CRN |
| `IBM_BACKEND` | IBM backend (e.g. `ibm_fez`, `ibm_torino`) |
| `QUANTUMGRID_TAG` | XRPL DestinationTag (default: `42000`) |

---

## Verifiable XRPL transactions

All transactions are public on the XRPL testnet. The EscrowFinish memos contain the full result: quantum counts, result_hash, ibm_job_id, IBM verification URL.

- Testnet explorer: https://testnet.xrpl.org
- IBM verification: `https://quantum.ibm.com/jobs/{ibm_job_id}`

**Example on-chain flow:**
- `ESCROW CREATED` — Researcher locks 1 XRP
- `ESCROW FINALIZED` — Oracle reveals the fulfillment
- `PAYMENT SENT` — Oracle sends 0.90 XRP to the provider

---

## Tech stack

- **XRPL** — xrpl-py ≥ 2.4.0 (EscrowCreate, EscrowFinish, NFTokenMint, Payment)
- **Quantum** — Qiskit ≥ 1.0, Qiskit Aer, qiskit-ibm-runtime 0.43+
- **Async** — Python 3.9, asyncio, run_in_executor for compatibility
- **NFTs** — XRPL NFTokenMint, buy_and_certify (on-chain purchase proof)
- **Crypto** — PREIMAGE-SHA-256 ASN.1, format validated by automatic selftest
- **Monitoring** — escrow_monitor (TTL watchdog, automatic cancellation)
