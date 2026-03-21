import { Request, Response } from 'express'
import { prisma } from '../prisma'

export async function getUserByAddress(req: Request, res: Response) {
  const { xrplAddress } = req.params
  try {
    const user = await prisma.user.findFirst({
      where: { xrplAddress },
      include: { sessions: { take: 5 } },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function upsertUser(req: Request, res: Response) {
  const { email, password, xrplAddress } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    // Si l'utilisateur n'existe pas, on le crée
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        ...(xrplAddress && { xrplAddress })
      },
      create: {
        email,
        password, // À hasher avec bcrypt plus tard
        xrplAddress: xrplAddress || null
      },
    })
    res.status(201).json(user)
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function updateUser(req: Request, res: Response) {
  const { xrplAddress } = req.params
  const { email, password } = req.body

  try {
    const user = await prisma.user.updateMany({
      where: { xrplAddress },
      data: {
        ...(email && { email }),
        ...(password && { password }),
      },
    })
    res.json(user)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getUserStats(req: Request, res: Response) {
  try {
    res.json({ message: 'Stats calculation simplified' })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}
// POST /users/login — Vraie connexion Web2
export async function loginUser(req: Request, res: Response) {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  try {
    // 1. On cherche l'utilisateur par son email
    const user = await prisma.user.findUnique({ where: { email } })

    // 2. On vérifie si l'utilisateur existe ET si le mot de passe correspond
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    // 3. C'est tout bon ! On renvoie les infos (sans le mot de passe par sécurité)
    res.json({
      id: user.id,
      email: user.email,
      xrplAddress: user.xrplAddress
    })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
}