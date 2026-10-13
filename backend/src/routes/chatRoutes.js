import { Router } from 'express'
import { askGemini } from '../controllers/chatController.js'
import { authenticate } from '../middleware/auth.js'
import { createRateLimit } from '../middleware/rateLimit.js'

const router = Router()
const chatRateLimit = createRateLimit({ windowMs: 60_000, maxRequests: 20 })

router.post('/gemini', chatRateLimit, authenticate, askGemini)

export default router
