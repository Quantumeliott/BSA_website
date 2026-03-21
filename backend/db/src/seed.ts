// =============================================
// QuantumGrid — Seed Script
// npx ts-node src/seed.ts
// =============================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ---- Users ----
  const alice = await prisma.user.upsert({
    where:  { xrplAddress: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh' },
    update: {},
    create: {
      xrplAddress: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
      email:       'ada@eth.ch',
      name:        'Dr. Ada Lovelace',
      role:        'RESEARCHER',
      institution: 'ETH Zurich',
    },
  })

  const provider1 = await prisma.user.upsert({
    where:  { xrplAddress: 'rAtacamaObservatoryXRPL123456789' },
    update: {},
    create: {
      xrplAddress: 'rAtacamaObservatoryXRPL123456789',
      name:        'Atacama Observatory',
      role:        'PROVIDER',
      institution: 'ESO Partner Network',
    },
  })

  const provider2 = await prisma.user.upsert({
    where:  { xrplAddress: 'rETHZurichQuantumLabXRPL98765432' },
    update: {},
    create: {
      xrplAddress: 'rETHZurichQuantumLabXRPL98765432',
      name:        'ETH Zurich Quantum Lab',
      role:        'PROVIDER',
      institution: 'ETH Zurich',
    },
  })

  // ---- Instruments ----
  const telescope1 = await prisma.instrument.upsert({
    where:  { id: 'inst-telescope-atacama' },
    update: {},
    create: {
      id:          'inst-telescope-atacama',
      name:        'Hα Solar Array — T24',
      type:        'TELESCOPE',
      status:      'ONLINE',
      location:    'Atacama Desert, Chile',
      country:     'Chile',
      latitude:    -24.6272,
      longitude:   -70.4042,
      priceXRP:    0.48,
      rateUnit:    'per_min',
      minSession:  900,
      providerId:  provider1.id,
      specs: {
        aperture:    '600mm f/8',
        camera:      '16MP Cooled CCD',
        seeing:      '1.2" FWHM',
        filters:     ['Hα', 'OIII', 'SII', 'RGB'],
        altitude:    2400,
      },
      description: 'Professional solar telescope located at 2400m altitude in the Atacama Desert.',
    },
  })

  const quantum1 = await prisma.instrument.upsert({
    where:  { id: 'inst-quantum-ethz' },
    update: {},
    create: {
      id:          'inst-quantum-ethz',
      name:        'Cat Qubit — Lab Node 3',
      type:        'QUANTUM',
      status:      'ONLINE',
      location:    'ETH Zurich, Switzerland',
      country:     'Switzerland',
      latitude:    47.3769,
      longitude:   8.5417,
      priceXRP:    0.12,
      rateUnit:    'per_shot',
      minSession:  100,
      providerId:  provider2.id,
      specs: {
        qubits:       12,
        gateFidelity: 99.1,
        technology:   'Superconducting cat qubit',
        connectivity: 'Linear',
        t1:           '200μs',
        t2:           '150μs',
      },
      description: 'Research-grade cat qubit processor with high gate fidelity.',
    },
  })

  await prisma.instrument.upsert({
    where:  { id: 'inst-telescope-lapalma' },
    update: {},
    create: {
      id:          'inst-telescope-lapalma',
      name:        'IR Deep Field — Celestron C14',
      type:        'TELESCOPE',
      status:      'BUSY',
      location:    'La Palma, Canary Islands',
      country:     'Spain',
      latitude:    28.7563,
      longitude:   -17.8930,
      priceXRP:    0.82,
      rateUnit:    'per_min',
      minSession:  1800,
      specs: {
        aperture:    '355mm f/11',
        camera:      'Full-frame IR',
        seeing:      '0.8" FWHM',
        filters:     ['IR', 'RGB', 'Luminance'],
        altitude:    2360,
      },
    },
  })

  await prisma.instrument.upsert({
    where:  { id: 'inst-spectro-tokyo' },
    update: {},
    create: {
      id:          'inst-spectro-tokyo',
      name:        'LIBS Analyzer — Spectro-X2',
      type:        'SPECTROGRAPH',
      status:      'ONLINE',
      location:    'University of Tokyo, Japan',
      country:     'Japan',
      priceXRP:    0.24,
      rateUnit:    'per_min',
      minSession:  600,
      specs: {
        resolution: '0.03nm',
        range:      '200-900nm',
        detector:   'CCD Array',
        samples:    'Remote drop',
      },
    },
  })

  await prisma.instrument.upsert({
    where:  { id: 'inst-quantum-paris' },
    update: {},
    create: {
      id:          'inst-quantum-paris',
      name:        'Photonic QPU — Xanadu X8',
      type:        'QUANTUM',
      status:      'ONLINE',
      location:    'Paris Quantum Campus, France',
      country:     'France',
      priceXRP:    0.08,
      rateUnit:    'per_shot',
      minSession:  50,
      specs: {
        modes:      8,
        technology: 'Gaussian Boson Sampling',
        squeezing:  '12dB',
        photons:    4,
      },
    },
  })

  await prisma.instrument.upsert({
    where:  { id: 'inst-radio-westerbork' },
    update: {},
    create: {
      id:          'inst-radio-westerbork',
      name:        'Radio Array — 21cm Band',
      type:        'RADIO',
      status:      'OFFLINE',
      location:    'Westerbork, Netherlands',
      country:     'Netherlands',
      priceXRP:    2.40,
      rateUnit:    'per_hour',
      minSession:  3600,
      specs: {
        frequency:  '1.4 GHz',
        dishes:     14,
        dishSize:   '25m',
        baseline:   '2.7km',
      },
    },
  })

  // ---- Sample sessions for alice ----
  await prisma.session.createMany({
    skipDuplicates: true,
    data: [
      {
        id:             'sess-alice-quantum-1',
        userId:         alice.id,
        instrumentId:   quantum1.id,
        escrowType:     'PAYMENT_CHANNEL',
        xrplTxHash:     '0xE5F67890ABCDEF1234567890ABCDEF12',
        channelId:      'CHAN_ETH_001',
        status:         'COMPLETED',
        durationSec:    0,
        actualShots:    240,
        xrpLocked:      30.0,
        xrpSpent:       28.8,
        xrpRefunded:    1.2,
        startedAt:      new Date('2026-03-20T14:00:00Z'),
        endedAt:        new Date('2026-03-20T15:30:00Z'),
        receipt:        { oracle: 'ETH_QUBIT_LAB', shots: 240, verified: true },
      },
      {
        id:             'sess-alice-spectro-1',
        userId:         alice.id,
        instrumentId:   'inst-spectro-tokyo',
        escrowType:     'ESCROW',
        xrplTxHash:     '0xA2C4D1F2E3B5A6D7C8E9F0A1B2C3D4E5',
        status:         'COMPLETED',
        durationSec:    2700,
        actualSec:      2700,
        xrpLocked:      12.0,
        xrpSpent:       10.8,
        xrpRefunded:    1.2,
        startedAt:      new Date('2026-03-18T09:00:00Z'),
        endedAt:        new Date('2026-03-18T09:45:00Z'),
      },
    ],
  })

  console.log('✅ Seed complete')
  console.log(`   Users: alice (${alice.id}), 2 providers`)
  console.log(`   Instruments: 6 seeded`)
  console.log(`   Sessions: 2 completed for alice`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => await prisma.$disconnect())
