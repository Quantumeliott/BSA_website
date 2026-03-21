# QuantumGrid 🔭⚛️

> DePIN marketplace for scientific instruments — powered by the XRP Ledger.
> Pay-per-second access to telescopes, quantum computers, and rare lab equipment.
> No banks. No borders. Trustless by design.

---

## Project Structure

```
quantumgrid/
├── frontend/                   # Static web app (HTML + CSS + JS)
│   ├── index.html              # Main entry point
│   ├── css/
│   │   ├── variables.css       # Design tokens, reset, shared animations
│   │   ├── nav.css             # Navigation bar
│   │   ├── hero.css            # Hero section + stats bar
│   │   ├── marketplace.css     # Instrument cards grid
│   │   ├── session.css         # Live session demo panel
│   │   ├── modal.css           # Booking modal
│   │   └── how.css             # How it works + footer
│   └── js/
│       ├── main.js             # Entry point — wires everything together
│       ├── session.js          # Live session timer + Payment Channel sim
│       ├── modal.js            # Booking modal logic
│       └── wallet.js           # XRPL wallet connection (Crossmark / XUMM)
│
└── backend/
    ├── xrpl/
    │   ├── escrow.js           # XRPL EscrowCreate / EscrowFinish / EscrowCancel
    │   └── paymentChannel.js   # XRPL PaymentChannelCreate / signClaim / claimPayment
    └── oracle/
        ├── oracle.h            # Oracle class declaration
        ├── oracle.cpp          # Oracle implementation (session mgmt, BLAKE2b, HTTP)
        ├── main.cpp            # HTTP server exposing Oracle REST API
        └── CMakeLists.txt      # Build config (nlohmann/json, cpp-httplib, curl, openssl)
```

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│              FRONTEND (browser)                       │
│   index.html + CSS modules + JS modules              │
│   Wallet: Crossmark / XUMM                           │
└────────────┬────────────────────────┬────────────────┘
             │                        │
   ┌─────────▼──────────┐   ┌────────▼───────────────┐
   │   XRPL Testnet      │   │   Oracle (C++ server)  │
   │                     │   │   :8080                │
   │ • EscrowCreate      │   │                        │
   │ • EscrowFinish      │   │ POST /sessions/start   │
   │ • PayChanCreate     │   │ POST /sessions/shot    │
   │ • PayChanClaim      │   │ POST /sessions/finalise│
   └─────────────────────┘   └────────────────────────┘
```

### Flow — Telescope (Escrow)
1. Frontend calls Oracle `POST /sessions/start` → gets `condition_hex`
2. Frontend creates `EscrowCreate` on XRPL with `condition_hex`
3. Oracle activates instrument session
4. Session runs, images delivered
5. Oracle calls `POST /sessions/finalise` → returns `fulfillment_hex`
6. Provider submits `EscrowFinish` with `fulfillment_hex` → paid ✅
7. If provider fails → user calls `EscrowCancel` after expiry

### Flow — Quantum (Payment Channel)
1. Frontend opens `PaymentChannelCreate` on XRPL (budget locked)
2. For each shot: user signs off-chain claim (`signClaim`)
3. Signed claim sent to Oracle → executes QASM circuit
4. Oracle returns measurement results
5. At session end: provider submits last claim (`claimPayment`) → paid ✅
6. User requests channel close → surplus refunded

---

## Setup

### Frontend
```bash
# No build step needed — pure HTML/CSS/JS modules
cd frontend
# Serve with any static server:
npx serve .
# or
python3 -m http.server 3000
```

### XRPL Backend
```bash
cd backend/xrpl
npm install xrpl
# Use escrow.js and paymentChannel.js as modules in your Node.js backend
```

### Oracle (C++)
```bash
cd backend/oracle

# Install system dependencies
sudo apt install libcurl4-openssl-dev libssl-dev cmake build-essential

# Build
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)

# Run (simulation mode by default)
SIMULATION_MODE=true ./oracle
# Oracle listens on :8080
```

### Environment Variables (Oracle)
| Variable | Description | Default |
|---|---|---|
| `ORACLE_PRIVATE_KEY` | Ed25519 private key hex for signing receipts | — |
| `ORACLE_XRPL_ADDRESS` | Oracle's XRPL r-address | — |
| `INSTRUMENT_API_URL` | Instrument hardware API endpoint | `http://localhost:9000` |
| `INSTRUMENT_API_KEY` | Hardware API auth key | — |
| `SIMULATION_MODE` | `true` = use Qiskit simulator, no real hardware | `true` |

---

## XRPL Network

- **Testnet**: `wss://s.altnet.rippletest.net:51233`
- **Explorer**: https://testnet.xrpl.org
- **Faucet**: https://faucet.altnet.rippletest.net

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | HTML5 + CSS modules + ES modules (no framework) |
| Wallet | Crossmark / XUMM |
| XRPL | `xrpl.js` v3 |
| Oracle server | C++20 + cpp-httplib + nlohmann/json |
| Crypto | OpenSSL (BLAKE2b, SHA-256, Ed25519) |
| HTTP client | libcurl |

---

## Hackathon Demo Checklist

- [ ] Wallet connects via Crossmark on XRPL Testnet
- [ ] EscrowCreate submitted and visible on testnet.xrpl.org
- [ ] Payment Channel opened with 2-3 signed claims
- [ ] Oracle running in simulation mode (Qiskit results)
- [ ] Live session panel showing XRP decrementing in real time
- [ ] On-chain receipt/memo visible in Explorer

---

*Built at hackathon 2025 — DePIN Science, powered by XRPL*
