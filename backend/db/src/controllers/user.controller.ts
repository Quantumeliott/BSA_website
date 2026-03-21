import { Request, Response } from 'express'
import { prisma } from '../prisma'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

// GET /users/:xrplAddress
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
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.upsert({
      where: { email: email },
      update: { 
        password: hashedPassword, 
        name: name || undefined 
      },
      create: {
        email: email,
        password: hashedPassword,
        name: name || null,
        xrplAddress: null // <--- TRÈS IMPORTANT : On laisse vide pour la création
      },
    });

    res.status(201).json({ id: user.id, email: user.email });
  } catch (err: any) {
    console.error("ERREUR DÉTAILLÉE :", err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: "Cet email est déjà utilisé par un autre compte." });
    }
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
}

// POST /users/login — Connexion sécurisée
export async function loginUser(req: Request, res: Response) {
  const { email, password } = req.body
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Identifiants incorrects' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ error: 'Identifiants incorrects' })

    res.json({ id: user.id, email: user.email, xrplAddress: user.xrplAddress })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// PATCH /users/:xrplAddress
export async function updateUser(req: Request, res: Response) {
  const { xrplAddress } = req.params
  const { email, password } = req.body
  try {
    const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : undefined
    const user = await prisma.user.updateMany({
      where: { xrplAddress },
      data: {
        ...(email && { email }),
        ...(hashedPassword && { password: hashedPassword }),
      },
    })
    res.json(user)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /users/:xrplAddress/stats
export async function getUserStats(req: Request, res: Response) {
  res.json({ message: 'Stats calculation simplified' })
}

