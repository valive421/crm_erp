import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { listAssignableUsers, listBatches, listCategories, listItems, listLocations } from '../controllers/operationsMetaController.js'

const router = Router()

router.get('/categories', authenticate, listCategories)
router.get('/locations', authenticate, listLocations)
router.get('/assignable-users', authenticate, listAssignableUsers)
router.get('/items', authenticate, listItems)
router.get('/batches', authenticate, listBatches)

export default router
