import { Request, Response } from 'express'
import { prisma } from '../prisma'
import bcrypt from 'bcrypt' // On importe le sésame

const SALT_ROUNDS = 10 // La force du hachage

export async function upsertUser(req: Request, res: Response) {
  const { email, password, xrplAddress } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    // 1. On HACHE le mot de passe avant de l'envoyer à la DB
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        ...(xrplAddress && { xrplAddress })
      },
      create: {
        email,
        password: hashedPassword,
        xrplAddress: xrplAddress || null
      },
    })
    res.status(201).json({ message: "Utilisateur créé en toute sécurité" })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function loginUser(req: Request, res: Response) {
  const { email, password } = req.body

  try {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) return res.status(401).json({ error: 'Identifiants incorrects' })

    // 2. On COMPARE le mot de passe reçu avec le hash stocké
    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({ error: 'Identifiants incorrects' })
    }

    res.json({ id: user.id, email: user.email, xrplAddress: user.xrplAddress })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
}