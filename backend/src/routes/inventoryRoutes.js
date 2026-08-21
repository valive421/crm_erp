import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { createAdjustment, listInventory, listTransactions } from '../controllers/inventoryController.js'

const router = Router()

router.get('/', authenticate, authorize('OPERATIONS', 'SALES'), listInventory)
router.get('/transactions', authenticate, authorize('OPERATIONS'), listTransactions)
router.post('/adjustments', authenticate, authorize('OPERATIONS'), createAdjustment)

export default router
