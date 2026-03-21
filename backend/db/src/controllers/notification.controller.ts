import { Request, Response } from 'express'

export async function listNotifications(req: Request, res: Response) {
  res.json([]) // Plus de table notification
}

export async function markRead(req: Request, res: Response) {
  res.json({ success: true })
}

export async function markAllRead(req: Request, res: Response) {
  res.json({ success: true })
}