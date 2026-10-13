import { Router } from 'express'
import { askGemini } from '../controllers/chatController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.post('/gemini', authenticate, askGemini)

export default router
