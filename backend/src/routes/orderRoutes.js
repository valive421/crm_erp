import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { cancelOrder, createOrder, listOrders } from '../controllers/orderController.js'

const router = Router()

router.get('/', authenticate, authorize('SALES'), listOrders)
router.post('/', authenticate, authorize('SALES'), createOrder)
router.post('/:id/cancel', authenticate, authorize('SALES'), cancelOrder)

export default router
