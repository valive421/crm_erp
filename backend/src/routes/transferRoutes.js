import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { createTransfer, dispatchTransfer, listTransfers, receiveTransfer } from '../controllers/transferController.js'

const router = Router()

router.get('/', authenticate, authorize('OPERATIONS'), listTransfers)
router.post('/', authenticate, authorize('OPERATIONS'), createTransfer)
router.post('/:id/dispatch', authenticate, authorize('OPERATIONS'), dispatchTransfer)
router.post('/:id/receive', authenticate, authorize('OPERATIONS'), receiveTransfer)

export default router
