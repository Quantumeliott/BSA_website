// =============================================
// QuantumGrid — Instrument Controller
// =============================================

import { Request, Response } from 'express'
import { prisma } from '../prisma'
import { InstrumentType, InstrumentStatus } from '@prisma/client'

// GET /instruments — list with filters
export async function listInstruments(req: Request, res: Response) {
  const { type, status, country, page = '1', limit = '20' } = req.query

  const where: any = {}
  if (type)    where.type    = type as InstrumentType
  if (status)  where.status  = status as InstrumentStatus
  if (country) where.country = { contains: country as string, mode: 'insensitive' }

  try {
    const [instruments, total] = await Promise.all([
      prisma.instrument.findMany({
        where,
        include: {
          provider: { select: { name: true, institution: true, xrplAddress: true } },
          _count:   { select: { sessions: true } },
        },
        orderBy: [
          { status: 'asc' },   // ONLINE first
          { createdAt: 'desc' },
        ],
        skip:  (parseInt(page as string) - 1) * parseInt(limit as string),
        take:  parseInt(limit as string),
      }),
      prisma.instrument.count({ where }),
    ])

    res.json({
      instruments,
      meta: {
        total,
        page:  parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /instruments/:id
export async function getInstrument(req: Request, res: Response) {
  const { id } = req.params

  try {
    const instrument = await prisma.instrument.findUnique({
      where: { id },
      include: {
        provider: { select: { name: true, institution: true, xrplAddress: true } },
        sessions: {
          where:   { status: 'ACTIVE' },
          select:  { id: true, startedAt: true, durationSec: true },
        },
        queue: {
          orderBy: { position: 'asc' },
          select:  { position: true, requestedSec: true, createdAt: true },
        },
      },
    })

    if (!instrument) return res.status(404).json({ error: 'Instrument not found' })
    res.json(instrument)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// POST /instruments — provider registers new instrument
export async function createInstrument(req: Request, res: Response) {
  const {
    name, type, location, country, latitude, longitude,
    priceXRP, rateUnit, minSession, specs, imageUrl, description, providerId,
  } = req.body

  if (!name || !type || !priceXRP || !rateUnit) {
    return res.status(400).json({ error: 'name, type, priceXRP and rateUnit are required' })
  }

  try {
    const instrument = await prisma.instrument.create({
      data: {
        name, type, location, country,
        latitude:   latitude   ?? null,
        longitude:  longitude  ?? null,
        priceXRP:   parseFloat(priceXRP),
        rateUnit,
        minSession: parseInt(minSession) ?? 600,
        specs:      specs      ?? {},
        imageUrl:   imageUrl   ?? null,
        description: description ?? null,
        providerId: providerId ?? null,
      },
    })
    res.status(201).json(instrument)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// PATCH /instruments/:id/status — update availability
export async function updateInstrumentStatus(req: Request, res: Response) {
  const { id }     = req.params
  const { status } = req.body

  if (!['ONLINE','BUSY','OFFLINE','MAINTENANCE'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  try {
    const instrument = await prisma.instrument.update({
      where: { id },
      data:  { status: status as InstrumentStatus },
    })
    res.json(instrument)
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Instrument not found' })
    res.status(500).json({ error: 'Internal server error' })
  }
}
