// =============================================
// QuantumGrid — Express API Server
// =============================================

import express from 'express'
import cors    from 'cors'
import helmet  from 'helmet'
import router  from './routes'
import { prisma } from './prisma'

const app  = express()
const PORT = process.env.PORT || 4000

// ---- Middleware ----
app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))
app.use(express.json())

// ---- Request logger (dev) ----
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${req.method}] ${req.path}`)
    next()
  })
}

// ---- Routes ----
app.use('/api', router)

// ---- Health ----
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'quantumgrid-api', ts: new Date() })
})

// ---- 404 ----
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// ---- Global error handler ----
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

// ---- Start ----
app.listen(PORT, async () => {
  await prisma.$connect()
  console.log(`[API] Running on :${PORT}`)
  console.log(`[API] DB connected`)
})

// ---- Graceful shutdown ----
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
