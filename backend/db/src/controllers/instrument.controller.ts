import { Request, Response } from 'express'
import { prisma } from '../prisma'

export async function listInstruments(req: Request, res: Response) {
  const { type, country, page = '1', limit = '20' } = req.query

  const where: any = {}
  if (type)    where.type    = type as string
  if (country) where.country = { contains: country as string, mode: 'insensitive' }

  try {
    const [instruments, total] = await Promise.all([
      prisma.instrument.findMany({
        where,
        include: {
          provider: { select: { email: true, xrplAddress: true } },
          _count:   { select: { sessions: true } },
        },
        skip:  (parseInt(page as string) - 1) * parseInt(limit as string),
        take:  parseInt(limit as string),
      }),
      prisma.instrument.count({ where }),
    ])

    res.json({
      instruments,
      meta: { total, page: parseInt(page as string), limit: parseInt(limit as string) }
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getInstrument(req: Request, res: Response) {
  const { id } = req.params
  try {
    const instrument = await prisma.instrument.findUnique({
      where: { id },
      include: {
        provider: { select: { email: true, xrplAddress: true } },
        sessions: { select: { id: true, status: true, createdAt: true } },
      },
    })
    if (!instrument) return res.status(404).json({ error: 'Instrument not found' })
    res.json(instrument)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function createInstrument(req: Request, res: Response) {
  const { name, type, agenda, location, country, priceXRP, image, providerId } = req.body

  if (!name || !type || priceXRP === undefined) {
    return res.status(400).json({ error: 'name, type, and priceXRP are required' })
  }

  try {
    const instrument = await prisma.instrument.create({
      data: {
        name, type, agenda: agenda ?? null, location, country,
        priceXRP: parseFloat(priceXRP),
        image: image ?? null,
        providerId: providerId ?? null,
      },
    })
    res.status(201).json(instrument)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function updateInstrumentStatus(req: Request, res: Response) {
  // L'instrument n'a plus de champ 'status' strict, on peut s'en servir pour modifier l'agenda par exemple.
  // Conservé pour ne pas casser le routeur actuel.
  res.json({ message: 'Status update mocked for Web2.5 architecture' })
}