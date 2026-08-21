import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { createWorkOrder, listWorkOrders, updateWorkOrderStatus } from '../controllers/workOrderController.js'

const router = Router()

router.get('/', authenticate, authorize('OPERATIONS'), listWorkOrders)
router.post('/', authenticate, authorize(), createWorkOrder)
router.patch('/:id/status', authenticate, authorize('OPERATIONS'), updateWorkOrderStatus)

export default router
