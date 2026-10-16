import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { getOptimization, listMovements, createMovement, getMovement } from '../controllers/inventoryController.js'

const router = Router()
router.get('/', authenticate, authorize('WAREHOUSE', 'ACCOUNTS'), listMovements)
router.get('/optimization', authenticate, authorize('WAREHOUSE', 'ACCOUNTS'), getOptimization)
router.post('/movements', authenticate, authorize('WAREHOUSE'), createMovement)
router.get('/movements/:id', authenticate, authorize('WAREHOUSE', 'ACCOUNTS'), getMovement)
export default router
