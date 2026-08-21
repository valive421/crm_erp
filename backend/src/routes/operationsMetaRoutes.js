import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { listAssignableUsers, listCategories, listLocations } from '../controllers/operationsMetaController.js'

const router = Router()

router.get('/categories', authenticate, listCategories)
router.get('/locations', authenticate, listLocations)
router.get('/assignable-users', authenticate, listAssignableUsers)

export default router
