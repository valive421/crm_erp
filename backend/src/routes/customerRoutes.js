import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { listCustomers, createCustomer, getCustomer, updateCustomer, deleteCustomer, listFollowUps, addFollowUp } from '../controllers/customerController.js'

const router = Router()
router.get('/', authenticate, authorize('SALES', 'WAREHOUSE', 'ACCOUNTS'), listCustomers)
router.post('/', authenticate, authorize('SALES'), createCustomer)
router.get('/:id', authenticate, authorize('SALES', 'WAREHOUSE', 'ACCOUNTS'), getCustomer)
router.put('/:id', authenticate, authorize('SALES'), updateCustomer)
router.patch('/:id', authenticate, authorize('SALES'), updateCustomer)
router.delete('/:id', authenticate, authorize('SALES'), deleteCustomer)
router.get('/:id/follow-ups', authenticate, authorize('SALES', 'WAREHOUSE', 'ACCOUNTS'), listFollowUps)
router.post('/:id/follow-ups', authenticate, authorize('SALES'), addFollowUp)
export default router
