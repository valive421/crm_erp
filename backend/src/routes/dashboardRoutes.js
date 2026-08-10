import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { getDashboard } from '../controllers/dashboardController.js'

const router = Router()
router.get('/', authenticate, getDashboard)
export default router
