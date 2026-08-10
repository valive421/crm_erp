import { asyncHandler } from '../utils/asyncHandler.js'
import { failure } from '../utils/response.js'
import { buildSearchClause, paginate, withTransaction } from '../services/dbHelpers.js'
import { query } from '../config/db.js'

const productFields = 'p.id, p.name, p.sku, p.category_id AS category, p.unit_price, p.current_stock, p.minimum_stock_alert_quantity, p.warehouse_id AS warehouse, p.created_at, p.updated_at, c.name AS category_name, w.name AS warehouse_name, w.location AS warehouse_location, CASE WHEN p.current_stock <= p.minimum_stock_alert_quantity THEN true ELSE false END AS low_stock'

export const listProducts = asyncHandler(async (request, response) => {
  const params = []
  // Search and filter criteria are composed here so the frontend stays thin.
  const search = buildSearchClause(['p.name', 'p.sku'], request.query.search, params)
  const filters = []
  if (request.query.category) {
    params.push(request.query.category)
    filters.push(`p.category_id = $${params.length}`)
  }
  if (request.query.warehouse) {
    params.push(request.query.warehouse)
    filters.push(`p.warehouse_id = $${params.length}`)
  }
  if (request.query.low_stock === 'true') {
    filters.push('p.current_stock <= p.minimum_stock_alert_quantity')
  }
  const filterSql = filters.length ? ` AND ${filters.join(' AND ')}` : ''
  const baseSql = `SELECT ${productFields} FROM products_product p JOIN products_category c ON c.id = p.category_id JOIN products_warehouse w ON w.id = p.warehouse_id WHERE 1=1${search}${filterSql} ORDER BY p.created_at DESC`
  const countSql = `SELECT COUNT(*)::int AS count FROM products_product p WHERE 1=1${search}${filterSql}`
  const result = await paginate(baseSql, params, { page: request.query.page || 1, pageSize: request.query.page_size || 10, countSql })
  return response.json(result)
})

export const createProduct = asyncHandler(async (request, response) => {
  const body = request.body
  if (!body.name || !body.sku) return failure(response, 'Name and SKU are required.', 400)
  const inserted = await query(
    `INSERT INTO products_product (name, sku, category_id, unit_price, current_stock, minimum_stock_alert_quantity, warehouse_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,COALESCE($5,0),COALESCE($6,0),$7,NOW(),NOW())
     RETURNING id`,
    [body.name, body.sku, body.category, body.unit_price, body.current_stock, body.minimum_stock_alert_quantity, body.warehouse],
  )
  return response.status(201).json(inserted.rows[0])
})

export const getProduct = asyncHandler(async (request, response) => {
  const result = await query(`SELECT ${productFields} FROM products_product p JOIN products_category c ON c.id = p.category_id JOIN products_warehouse w ON w.id = p.warehouse_id WHERE p.id = $1 LIMIT 1`, [request.params.id])
  if (!result.rows.length) return failure(response, 'Product not found.', 404)
  return response.json(result.rows[0])
})

export const updateProduct = asyncHandler(async (request, response) => {
  const body = request.body
  const result = await query(
    `UPDATE products_product SET
      name = COALESCE($1, name),
      sku = COALESCE($2, sku),
      category_id = COALESCE($3, category_id),
      unit_price = COALESCE($4, unit_price),
      minimum_stock_alert_quantity = COALESCE($5, minimum_stock_alert_quantity),
      warehouse_id = COALESCE($6, warehouse_id),
      updated_at = NOW()
    WHERE id = $7 RETURNING id`,
    [body.name || null, body.sku || null, body.category || null, body.unit_price || null, body.minimum_stock_alert_quantity || null, body.warehouse || null, request.params.id],
  )
  if (!result.rows.length) return failure(response, 'Product not found.', 404)
  return response.json(result.rows[0])
})

export const deleteProduct = asyncHandler(async (request, response) => {
  await query('DELETE FROM products_product WHERE id = $1', [request.params.id])
  return response.json({ success: true, message: 'Product deleted successfully.' })
})

export const listCategories = asyncHandler(async (request, response) => {
  const result = await query('SELECT id, name, created_at, updated_at FROM products_category ORDER BY name ASC')
  return response.json({ results: result.rows })
})

export const listWarehouses = asyncHandler(async (request, response) => {
  // The product form loads these options from live data instead of hardcoding them.
  const result = await query('SELECT id, name, location, created_at, updated_at FROM products_warehouse ORDER BY name ASC')
  return response.json({ results: result.rows })
})
