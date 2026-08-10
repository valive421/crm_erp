import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { listChallans, createChallan, getChallan, updateChallan, deleteChallan, confirmChallan, cancelChallan } from '../controllers/challanController.js'

const router = Router()
router.get('/', authenticate, authorize('SALES', 'WAREHOUSE', 'ACCOUNTS'), listChallans)
router.post('/', authenticate, authorize('SALES'), createChallan)
router.get('/:id', authenticate, authorize('SALES', 'WAREHOUSE', 'ACCOUNTS'), getChallan)
router.put('/:id', authenticate, authorize('SALES'), updateChallan)
router.patch('/:id', authenticate, authorize('SALES'), updateChallan)
router.delete('/:id', authenticate, authorize('SALES'), deleteChallan)
router.post('/:id/confirm', authenticate, authorize('SALES'), confirmChallan)
router.post('/:id/cancel', authenticate, authorize('SALES'), cancelChallan)
export default router
