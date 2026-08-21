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
