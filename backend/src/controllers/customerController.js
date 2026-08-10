import { asyncHandler } from '../utils/asyncHandler.js'
import { failure, success } from '../utils/response.js'
import { buildSearchClause, paginate, withTransaction } from '../services/dbHelpers.js'

const baseFields = 'id, name, mobile_number, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes, created_by_id AS created_by, created_at, updated_at'

function normalizeCustomer(row) {
  return row
}

export const listCustomers = asyncHandler(async (request, response) => {
  const params = []
  const search = buildSearchClause(['name', 'mobile_number', 'email', 'business_name', 'gst_number'], request.query.search, params)
  if (request.query.customer_type) {
    params.push(request.query.customer_type)
  }
  const typeClause = request.query.customer_type ? ` AND customer_type = $${params.length}` : ''
  if (request.query.status) {
    params.push(request.query.status)
  }
  const statusClause = request.query.status ? ` AND status = $${params.length}` : ''
  const page = request.query.page || 1
  const pageSize = request.query.page_size || 10
  const baseSql = `SELECT ${baseFields} FROM customers_customer WHERE 1=1${search}${typeClause}${statusClause} ORDER BY created_at DESC`
  const countSql = `SELECT COUNT(*)::int AS count FROM customers_customer WHERE 1=1${search}${typeClause}${statusClause}`
  const result = await paginate(baseSql, params, { page, pageSize, countSql })
  result.results = result.results.map(normalizeCustomer)
  return response.json(result)
})

export const createCustomer = asyncHandler(async (request, response) => {
  const body = request.body
  if (!body.name) return failure(response, 'Customer name is required.', 400)
  const result = await withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO customers_customer (name, mobile_number, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes, created_by_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
       RETURNING ${baseFields}`,
      [body.name, body.mobile_number, body.email || '', body.business_name || '', body.gst_number || null, body.customer_type, body.address || '', body.status || 'LEAD', body.follow_up_date || null, body.notes || '', request.user.id],
    )
    return inserted.rows[0]
  })
  return response.status(201).json(result)
})

export const getCustomer = asyncHandler(async (request, response) => {
  const result = await paginate(`SELECT ${baseFields} FROM customers_customer WHERE id = $1`, [request.params.id], { page: 1, pageSize: 1, countSql: 'SELECT COUNT(*)::int AS count FROM customers_customer WHERE id = $1' })
  if (!result.results.length) return failure(response, 'Customer not found.', 404)
  // Follow-up notes are embedded so the detail page can render one API payload.
  const followUps = await paginate('SELECT id, note, created_by_id, created_at, updated_at FROM customers_customerfollowup WHERE customer_id = $1 ORDER BY created_at DESC', [request.params.id], { page: 1, pageSize: 100, countSql: 'SELECT COUNT(*)::int AS count FROM customers_customerfollowup WHERE customer_id = $1' })
  return response.json({ ...result.results[0], follow_ups: followUps.results })
})

export const updateCustomer = asyncHandler(async (request, response) => {
  const body = request.body
  const customerId = request.params.id
  const current = await queryOne('SELECT id FROM customers_customer WHERE id = $1', [customerId])
  if (!current) return failure(response, 'Customer not found.', 404)
  const updated = await withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE customers_customer SET
        name = COALESCE($1, name),
        mobile_number = COALESCE($2, mobile_number),
        email = COALESCE($3, email),
        business_name = COALESCE($4, business_name),
        gst_number = COALESCE($5, gst_number),
        customer_type = COALESCE($6, customer_type),
        address = COALESCE($7, address),
        status = COALESCE($8, status),
        follow_up_date = COALESCE($9, follow_up_date),
        notes = COALESCE($10, notes),
        updated_at = NOW()
      WHERE id = $11 RETURNING ${baseFields}`,
      [body.name || null, body.mobile_number || null, body.email || null, body.business_name || null, body.gst_number || null, body.customer_type || null, body.address || null, body.status || null, body.follow_up_date || null, body.notes || null, customerId],
    )
    return result.rows[0]
  })
  return response.json(updated)
})

export const deleteCustomer = asyncHandler(async (request, response) => {
  await queryOne('DELETE FROM customers_customer WHERE id = $1', [request.params.id])
  return success(response, 'Customer deleted successfully.')
})

export const listFollowUps = asyncHandler(async (request, response) => {
  const followUps = await paginate('SELECT id, note, created_by_id, created_at, updated_at FROM customers_customerfollowup WHERE customer_id = $1 ORDER BY created_at DESC', [request.params.id], { page: 1, pageSize: 100, countSql: 'SELECT COUNT(*)::int AS count FROM customers_customerfollowup WHERE customer_id = $1' })
  return response.json(followUps)
})

export const addFollowUp = asyncHandler(async (request, response) => {
  if (!request.body.note) return failure(response, 'Note is required.', 400)
  const inserted = await queryOne(
    'INSERT INTO customers_customerfollowup (customer_id, note, created_by_id, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id, note, created_by_id, created_at, updated_at',
    [request.params.id, request.body.note, request.user.id],
  )
  return response.status(201).json(inserted)
})

async function queryOne(sql, params) {
  const { query } = await import('../config/db.js')
  const result = await query(sql, params)
  return result.rows[0] || null
}
