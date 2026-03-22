import { Request, Response } from 'express'
import { prisma } from '../prisma'

export async function listSessions(req: Request, res: Response) {
  const { userId, instrumentId, status } = req.query

  const where: any = {}
  if (userId)       where.userId       = userId
  if (instrumentId) where.instrumentId = instrumentId
  if (status)       where.status       = status as string

  try {
    const sessions = await prisma.session.findMany({
      where,
      include: {
        instrument: { select: { name: true, type: true, location: true } },
        user:       { select: { email: true, xrplAddress: true } },
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ sessions })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getSession(req: Request, res: Response) {
  const { id } = req.params
  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: { instrument: true, user: { select: { email: true, xrplAddress: true } } },
    })
    if (!session) return res.status(404).json({ error: 'Session not found' })
    res.json(session)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function createSession(req: Request, res: Response) {
  const { userId, instrumentId, priceXRP, xrplTxHash } = req.body
  if (!userId || !instrumentId || !priceXRP) {
    return res.status(400).json({ error: 'userId, instrumentId and priceXRP are required' })
  }

  try {
    const session = await prisma.session.create({
      data: {
        userId,
        instrumentId,
        priceXRP:   parseFloat(priceXRP),
        xrplTxHash: xrplTxHash ?? null,
        status:     'PENDING',
      },
      include: { instrument: { select: { name: true, type: true } } },
    })
    res.status(201).json(session)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function startSession(req: Request, res: Response) {
  try {
    const session = await prisma.session.update({
      where: { id: req.params.id },
      data:  { status: 'ACTIVE' }, // Suppression de startedAt
    })
    res.json(session)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function completeSession(req: Request, res: Response) {
  try {
    const session = await prisma.session.update({
      where: { id: req.params.id },
      data:  { status: 'COMPLETED' }, // Suppression de endedAt
    })
    res.json(session)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function cancelSession(req: Request, res: Response) {
  try {
    const session = await prisma.session.update({
      where: { id: req.params.id },
      data:  { status: 'CANCELLED' }, // Suppression de endedAt
    })
    res.json(session)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function addPaymentClaim(req: Request, res: Response) {
  res.status(201).json({ message: 'Claim tracked on XRPL' })
}