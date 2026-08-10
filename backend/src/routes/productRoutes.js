import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { listProducts, createProduct, getProduct, updateProduct, deleteProduct, listCategories, listWarehouses } from '../controllers/productController.js'

const router = Router()
router.get('/', authenticate, authorize('SALES', 'WAREHOUSE', 'ACCOUNTS'), listProducts)
router.get('/meta/categories', authenticate, authorize('SALES', 'WAREHOUSE', 'ACCOUNTS'), listCategories)
router.get('/meta/warehouses', authenticate, authorize('SALES', 'WAREHOUSE', 'ACCOUNTS'), listWarehouses)
router.post('/', authenticate, authorize('WAREHOUSE'), createProduct)
router.get('/:id', authenticate, authorize('SALES', 'WAREHOUSE', 'ACCOUNTS'), getProduct)
router.put('/:id', authenticate, authorize('WAREHOUSE'), updateProduct)
router.patch('/:id', authenticate, authorize('WAREHOUSE'), updateProduct)
router.delete('/:id', authenticate, authorize('WAREHOUSE'), deleteProduct)
export default router
