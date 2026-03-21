// =============================================
// QuantumGrid — Routes
// =============================================

import { Router } from 'express'

import {
  getUserByAddress, upsertUser, updateUser, getUserStats,
} from '../controllers/user.controller'

import {
  listInstruments, getInstrument, createInstrument, updateInstrumentStatus,
} from '../controllers/instrument.controller'

import {
  listSessions, getSession, createSession,
  startSession, completeSession, cancelSession, addPaymentClaim,
} from '../controllers/session.controller'

import {
  listNotifications, markRead, markAllRead,
} from '../controllers/notification.controller'

const router = Router()

// ---- Users ----
router.get   ('/users/:xrplAddress',       getUserByAddress)
router.get   ('/users/:xrplAddress/stats', getUserStats)
router.post  ('/users',                    upsertUser)
router.patch ('/users/:xrplAddress',       updateUser)

// ---- Instruments ----
router.get   ('/instruments',              listInstruments)
router.get   ('/instruments/:id',          getInstrument)
router.post  ('/instruments',              createInstrument)
router.patch ('/instruments/:id/status',   updateInstrumentStatus)

// ---- Sessions ----
router.get   ('/sessions',                 listSessions)
router.get   ('/sessions/:id',             getSession)
router.post  ('/sessions',                 createSession)
router.patch ('/sessions/:id/start',       startSession)
router.patch ('/sessions/:id/complete',    completeSession)
router.patch ('/sessions/:id/cancel',      cancelSession)
router.post  ('/sessions/:id/claims',      addPaymentClaim)

// ---- Notifications ----
router.get   ('/notifications',            listNotifications)
router.patch ('/notifications/read-all',   markAllRead)
router.patch ('/notifications/:id/read',   markRead)

export default router
