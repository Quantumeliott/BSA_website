// =============================================
// QUANTUMGRID — Config & Instruments Data
// =============================================

const CONFIG = {
  // XRPL
  XRPL_NETWORK:   'wss://s.altnet.rippletest.net:51233', // Testnet
  XRPL_EXPLORER:  'https://testnet.xrpl.org/transactions/',

  // Backend (oracle)
  API_BASE:       'http://localhost:8000',

  // Session
  SESSION_POLL_MS: 1000,   // tick every second
  CLAIM_INTERVAL_S: 30,    // log a claim every 30s in demo
};

// Instrument catalogue (would come from API in production)
const INSTRUMENTS = [
  {
    id: 'telescope-t24',
    type: 'telescope',
    status: 'online',          // online | busy | offline
    name: 'Hα Solar Array\n— T24',
    nameShort: 'Hα Solar Array T24',
    location: '📍 Atacama Desert, Chile · 2400m altitude',
    specs: {
      'Aperture':     '600mm f/8',
      'Camera':       '16MP Cooled CCD',
      'Min. Session': '15 min',
      'Seeing':       '1.2" FWHM',
    },
    rateXRP:  0.48,
    rateUnit: 'min',
    minSession: 15,
    maxSession: 120,
  },
  {
    id: 'quantum-eth-lab3',
    type: 'quantum',
    status: 'online',
    name: 'Cat Qubit\n— Lab Node 3',
    nameShort: 'Cat Qubit Lab Node 3',
    location: '📍 ETH Zurich, Switzerland · Research Grade',
    specs: {
      'Qubits':       '12 logical',
      'Gate Fidelity':'99.1%',
      'Min. Budget':  '100 shots',
      'Queue':        '~4 min',
    },
    rateXRP:  0.12,
    rateUnit: 'shot',
    minSession: 100,
    maxSession: 10000,
  },
  {
    id: 'telescope-c14',
    type: 'telescope',
    status: 'busy',
    name: 'IR Deep Field\n— Celestron C14',
    nameShort: 'IR Deep Field Celestron C14',
    location: '📍 La Palma, Canary Islands',
    specs: {
      'Aperture':     '355mm f/11',
      'Camera':       'Full-frame IR',
      'Min. Session': '30 min',
      'Queue':        '~22 min',
    },
    rateXRP:  0.82,
    rateUnit: 'min',
    minSession: 30,
    maxSession: 180,
  },
  {
    id: 'spectro-x2',
    type: 'spectro',
    status: 'online',
    name: 'LIBS Analyzer\n— Spectro-X2',
    nameShort: 'LIBS Spectro-X2',
    location: '📍 University of Tokyo, Japan',
    specs: {
      'Resolution':   '0.03nm',
      'Range':        '200–900nm',
      'Min. Session': '10 min',
      'Samples':      'Remote drop',
    },
    rateXRP:  0.24,
    rateUnit: 'min',
    minSession: 10,
    maxSession: 60,
  },
  {
    id: 'quantum-xanadu-x8',
    type: 'quantum',
    status: 'online',
    name: 'Photonic QPU\n— Xanadu X8',
    nameShort: 'Xanadu X8 Photonic QPU',
    location: '📍 Paris Quantum Campus, France',
    specs: {
      'Modes':        '8 photonic',
      'Technology':   'GBS',
      'Min. Budget':  '50 shots',
      'Queue':        '~1 min',
    },
    rateXRP:  0.08,
    rateUnit: 'shot',
    minSession: 50,
    maxSession: 5000,
  },
  {
    id: 'radio-westerbork',
    type: 'radio',
    status: 'offline',
    name: 'Radio Array\n— 21cm Band',
    nameShort: 'Radio Array 21cm Band',
    location: '📍 Westerbork, Netherlands · Maintenance',
    specs: {
      'Frequency':    '1.4 GHz',
      'Dishes':       '14 × 25m',
      'Back Online':  '~6h',
      'Min. Session': '1 hour',
    },
    rateXRP:  2.40,
    rateUnit: 'hour',
    minSession: 60,
    maxSession: 480,
  },
];
