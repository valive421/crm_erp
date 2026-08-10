import { asyncHandler } from '../utils/asyncHandler.js'
import { failure } from '../utils/response.js'
import { paginate, withTransaction } from '../services/dbHelpers.js'
import { query } from '../config/db.js'

export const listMovements = asyncHandler(async (request, response) => {
  const result = await paginate('SELECT sm.id, sm.product_id AS product, p.name AS product_name, sm.quantity_changed, sm.movement_type, sm.reason, sm.created_by_id, sm.created_at, sm.updated_at FROM inventory_stockmovement sm JOIN products_product p ON p.id = sm.product_id ORDER BY sm.created_at DESC', [], { page: request.query.page || 1, pageSize: request.query.page_size || 10, countSql: 'SELECT COUNT(*)::int AS count FROM inventory_stockmovement' })
  return response.json(result)
})

export const createMovement = asyncHandler(async (request, response) => {
  const body = request.body
  if (!body.product || !body.quantity_changed || !body.movement_type) return failure(response, 'Product, quantity and movement type are required.', 400)
  const result = await withTransaction(async (client) => {
    // Stock is locked before the update so concurrent movements cannot drift negative.
    const productResult = await client.query('SELECT * FROM products_product WHERE id = $1 FOR UPDATE', [body.product])
    const product = productResult.rows[0]
    if (!product) throw Object.assign(new Error('Product not found.'), { status: 404 })
    const quantity = Number(body.quantity_changed)
    if (body.movement_type === 'OUT' && Number(product.current_stock) < quantity) {
      throw Object.assign(new Error('Insufficient stock for this product.'), { status: 400, available: Number(product.current_stock), requested: quantity })
    }
    const nextStock = body.movement_type === 'OUT' ? Number(product.current_stock) - quantity : Number(product.current_stock) + quantity
    await client.query('UPDATE products_product SET current_stock = $1, updated_at = NOW() WHERE id = $2', [nextStock, body.product])
    const inserted = await client.query(
      'INSERT INTO inventory_stockmovement (product_id, quantity_changed, movement_type, reason, created_by_id, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) RETURNING id, product_id AS product, quantity_changed, movement_type, reason, created_by_id, created_at, updated_at',
      [body.product, quantity, body.movement_type, body.reason || '', request.user.id],
    )
    return inserted.rows[0]
  })
  return response.status(201).json(result)
})

export const getMovement = asyncHandler(async (request, response) => {
  const result = await query('SELECT sm.id, sm.product_id AS product, p.name AS product_name, sm.quantity_changed, sm.movement_type, sm.reason, sm.created_by_id, sm.created_at, sm.updated_at FROM inventory_stockmovement sm JOIN products_product p ON p.id = sm.product_id WHERE sm.id = $1 LIMIT 1', [request.params.id])
  if (!result.rows.length) return failure(response, 'Stock movement not found.', 404)
  return response.json(result.rows[0])
})
