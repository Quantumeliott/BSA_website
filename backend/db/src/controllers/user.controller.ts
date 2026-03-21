// =============================================
// QuantumGrid — User Controller
// =============================================

import { Request, Response } from 'express'
import { prisma } from '../prisma'
import { Role } from '@prisma/client'

// GET /users/:xrplAddress
export async function getUserByAddress(req: Request, res: Response) {
  const { xrplAddress } = req.params

  try {
    const user = await prisma.user.findUnique({
      where: { xrplAddress },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { instrument: { select: { name: true, type: true } } },
        },
      },
    })

    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// POST /users — create or upsert on wallet connect
export async function upsertUser(req: Request, res: Response) {
  const { xrplAddress, email, name, role, institution } = req.body

  if (!xrplAddress || !xrplAddress.startsWith('r')) {
    return res.status(400).json({ error: 'Invalid XRPL address' })
  }

  try {
    const user = await prisma.user.upsert({
      where: { xrplAddress },
      update: {
        ...(email       && { email }),
        ...(name        && { name }),
        ...(role        && { role: role as Role }),
        ...(institution && { institution }),
      },
      create: {
        xrplAddress,
        email:       email       || null,
        name:        name        || null,
        role:        (role as Role) || 'RESEARCHER',
        institution: institution || null,
      },
    })

    res.status(201).json(user)
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already in use' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
}

// PATCH /users/:xrplAddress
export async function updateUser(req: Request, res: Response) {
  const { xrplAddress } = req.params
  const { email, name, role, institution, avatarUrl } = req.body

  try {
    const user = await prisma.user.update({
      where: { xrplAddress },
      data: {
        ...(email       !== undefined && { email }),
        ...(name        !== undefined && { name }),
        ...(role        !== undefined && { role: role as Role }),
        ...(institution !== undefined && { institution }),
        ...(avatarUrl   !== undefined && { avatarUrl }),
      },
    })
    res.json(user)
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' })
    res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /users/:xrplAddress/stats
export async function getUserStats(req: Request, res: Response) {
  const { xrplAddress } = req.params

  try {
    const user = await prisma.user.findUnique({ where: { xrplAddress } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const [totalSessions, totalXrpSpent, activeSessions] = await Promise.all([
      prisma.session.count({ where: { userId: user.id } }),
      prisma.session.aggregate({
        where:   { userId: user.id, status: 'COMPLETED' },
        _sum:    { xrpSpent: true },
      }),
      prisma.session.count({
        where: { userId: user.id, status: 'ACTIVE' },
      }),
    ])

    res.json({
      totalSessions,
      totalXrpSpent:  totalXrpSpent._sum.xrpSpent ?? 0,
      activeSessions,
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}
