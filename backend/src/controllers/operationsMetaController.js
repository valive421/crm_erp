import { asyncHandler } from '../utils/asyncHandler.js'
import { query } from '../config/db.js'

export const listCategories = asyncHandler(async (request, response) => {
  const result = await query('SELECT id, name, created_at, updated_at FROM categories ORDER BY name ASC')
  response.json({ results: result.rows })
})

export const listLocations = asyncHandler(async (request, response) => {
  const result = await query('SELECT id, name, address, created_at, updated_at FROM locations ORDER BY name ASC')
  response.json({ results: result.rows })
})

export const listAssignableUsers = asyncHandler(async (request, response) => {
  const result = await query("SELECT id, username, first_name, last_name, email, role FROM users WHERE is_active = TRUE AND role IN ('ADMIN', 'OPERATIONS') ORDER BY username ASC")
  response.json({ results: result.rows })
})

export const listItems = asyncHandler(async (request, response) => {
  const result = await query(`SELECT item.id, item.sku, item.name, item.category_id, category.name AS category_name, item.unit_of_measure
    FROM items item JOIN categories category ON category.id = item.category_id
    WHERE item.is_active = TRUE ORDER BY item.name ASC`)
  response.json({ results: result.rows })
})

export const listBatches = asyncHandler(async (request, response) => {
  const itemId = Number(request.query.item_id)
  if (!Number.isSafeInteger(itemId) || itemId <= 0) {
    return response.status(400).json({ success: false, message: 'A positive item_id is required.' })
  }
  const result = await query('SELECT id, item_id, batch_code, received_at, expires_at FROM batches WHERE item_id = $1 ORDER BY batch_code ASC', [itemId])
  response.json({ results: result.rows })
})
