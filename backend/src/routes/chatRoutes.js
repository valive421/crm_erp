import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { askGemini } from '../controllers/chatController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
const chatRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.', data: null },
})

router.post('/gemini', chatRateLimit, authenticate, askGemini)

export default router
