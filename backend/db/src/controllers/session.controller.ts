// =============================================
// QuantumGrid — Session Controller
// Core business logic: links XRPL + Oracle + DB
// =============================================

import { Request, Response } from 'express'
import { prisma } from '../prisma'
import { SessionStatus, EscrowType } from '@prisma/client'

// GET /sessions — list for a user
export async function listSessions(req: Request, res: Response) {
  const { userId, instrumentId, status, page = '1', limit = '20' } = req.query

  const where: any = {}
  if (userId)       where.userId       = userId
  if (instrumentId) where.instrumentId = instrumentId
  if (status)       where.status       = status as SessionStatus

  try {
    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          instrument: { select: { name: true, type: true, location: true, rateUnit: true } },
          user:       { select: { name: true, xrplAddress: true } },
          claims:     { orderBy: { shotNumber: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip:    (parseInt(page as string) - 1) * parseInt(limit as string),
        take:    parseInt(limit as string),
      }),
      prisma.session.count({ where }),
    ])

    res.json({ sessions, meta: { total, page: parseInt(page as string) } })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /sessions/:id
export async function getSession(req: Request, res: Response) {
  const { id } = req.params

  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        instrument: true,
        user:       { select: { name: true, xrplAddress: true } },
        claims:     { orderBy: { shotNumber: 'asc' } },
      },
    })

    if (!session) return res.status(404).json({ error: 'Session not found' })
    res.json(session)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// POST /sessions — create session after XRPL escrow is submitted
// Called by frontend right after EscrowCreate / PaymentChannelCreate
export async function createSession(req: Request, res: Response) {
  const {
    userId, instrumentId, escrowType,
    xrplTxHash, channelId, escrowSequence, conditionHex,
    durationSec, xrpLocked, oracleSessionId,
  } = req.body

  if (!userId || !instrumentId || !escrowType || !durationSec || !xrpLocked) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Verify instrument exists and is available
    const instrument = await prisma.instrument.findUnique({
      where: { id: instrumentId },
    })
    if (!instrument) {
      return res.status(404).json({ error: 'Instrument not found' })
    }
    if (instrument.status === 'OFFLINE' || instrument.status === 'MAINTENANCE') {
      return res.status(409).json({ error: 'Instrument not available' })
    }

    // Create session record
    const session = await prisma.session.create({
      data: {
        userId,
        instrumentId,
        escrowType:     escrowType as EscrowType,
        xrplTxHash:     xrplTxHash    ?? null,
        channelId:      channelId     ?? null,
        escrowSequence: escrowSequence ?? null,
        conditionHex:   conditionHex  ?? null,
        durationSec:    parseInt(durationSec),
        xrpLocked:      parseFloat(xrpLocked),
        oracleSessionId: oracleSessionId ?? null,
        status:         'PENDING',
      },
      include: {
        instrument: { select: { name: true, type: true } },
      },
    })

    // Mark instrument as BUSY if it was ONLINE
    if (instrument.status === 'ONLINE') {
      await prisma.instrument.update({
        where: { id: instrumentId },
        data:  { status: 'BUSY' },
      })
    }

    res.status(201).json(session)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// PATCH /sessions/:id/start — oracle confirms session has begun
export async function startSession(req: Request, res: Response) {
  const { id } = req.params

  try {
    const session = await prisma.session.update({
      where: { id, status: 'PENDING' },
      data:  { status: 'ACTIVE', startedAt: new Date() },
    })

    // Notify user
    await prisma.notification.create({
      data: {
        userId: session.userId,
        type:   'session_start',
        title:  'Session started',
        body:   `Your instrument session is now active.`,
        metadata: { sessionId: id },
      },
    })

    res.json(session)
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Session not found or not PENDING' })
    res.status(500).json({ error: 'Internal server error' })
  }
}

// PATCH /sessions/:id/complete — oracle finalises, escrow released
export async function completeSession(req: Request, res: Response) {
  const { id } = req.params
  const { actualSec, actualShots, xrpSpent, xrpRefunded, fulfillmentHex, receipt } = req.body

  try {
    const session = await prisma.session.update({
      where: { id },
      data: {
        status:         'COMPLETED',
        endedAt:        new Date(),
        actualSec:      actualSec   ? parseFloat(actualSec)   : null,
        actualShots:    actualShots ? parseInt(actualShots)    : null,
        xrpSpent:       xrpSpent    ? parseFloat(xrpSpent)    : null,
        xrpRefunded:    xrpRefunded ? parseFloat(xrpRefunded) : null,
        fulfillmentHex: fulfillmentHex ?? null,
        receipt:        receipt ?? null,
      },
    })

    // Free up the instrument
    await prisma.instrument.update({
      where: { id: session.instrumentId },
      data:  { status: 'ONLINE' },
    })

    // Notify user
    await prisma.notification.create({
      data: {
        userId: session.userId,
        type:   'session_end',
        title:  'Session completed',
        body:   `${xrpRefunded ?? 0} XRP refunded to your wallet.`,
        metadata: { sessionId: id, xrpSpent, xrpRefunded },
      },
    })

    res.json(session)
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Session not found' })
    res.status(500).json({ error: 'Internal server error' })
  }
}

// PATCH /sessions/:id/cancel
export async function cancelSession(req: Request, res: Response) {
  const { id } = req.params

  try {
    const session = await prisma.session.update({
      where:  { id, status: { in: ['PENDING', 'ACTIVE'] } },
      data:   { status: 'CANCELLED', endedAt: new Date() },
    })

    await prisma.instrument.update({
      where: { id: session.instrumentId },
      data:  { status: 'ONLINE' },
    })

    res.json(session)
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Session not found or not cancellable' })
    res.status(500).json({ error: 'Internal server error' })
  }
}

// POST /sessions/:id/claims — log a Payment Channel claim (quantum)
export async function addPaymentClaim(req: Request, res: Response) {
  const { id: sessionId } = req.params
  const { shotNumber, cumulativeXRP, signedClaim } = req.body

  if (!shotNumber || !cumulativeXRP || !signedClaim) {
    return res.status(400).json({ error: 'shotNumber, cumulativeXRP, signedClaim required' })
  }

  try {
    const claim = await prisma.paymentClaim.create({
      data: {
        sessionId,
        shotNumber:    parseInt(shotNumber),
        cumulativeXRP: parseFloat(cumulativeXRP),
        signedClaim,
      },
    })
    res.status(201).json(claim)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}
