// =============================================
// QuantumGrid — Notification Controller
// =============================================

import { Request, Response } from 'express'
import { prisma } from '../prisma'

// GET /notifications?userId=xxx
export async function listNotifications(req: Request, res: Response) {
  const { userId, unreadOnly } = req.query

  if (!userId) return res.status(400).json({ error: 'userId required' })

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: userId as string,
        ...(unreadOnly === 'true' && { read: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json(notifications)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// PATCH /notifications/:id/read
export async function markRead(req: Request, res: Response) {
  const { id } = req.params
  try {
    const notif = await prisma.notification.update({
      where: { id },
      data:  { read: true },
    })
    res.json(notif)
  } catch {
    res.status(500).json({ error: 'Not found' })
  }
}

// PATCH /notifications/read-all?userId=xxx
export async function markAllRead(req: Request, res: Response) {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'userId required' })

  try {
    await prisma.notification.updateMany({
      where: { userId: userId as string, read: false },
      data:  { read: true },
    })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}
