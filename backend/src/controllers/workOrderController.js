import { asyncHandler } from '../utils/asyncHandler.js'
import { failure } from '../utils/response.js'
import { paginate, withTransaction } from '../services/dbHelpers.js'
import { query } from '../config/db.js'

const statuses = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED']

function positiveInteger(value) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function positiveQuantity(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const workOrderSelect = `SELECT wo.id, wo.work_order_number, wo.required_quantity, wo.status, wo.created_at, wo.updated_at,
  location.id AS location_id, location.name AS location_name,
  item.id AS item_id, item.sku, item.name AS item_name,
  assigned.id AS assigned_user_id, assigned.username AS assigned_username,
  creator.username AS created_by_username,
  COALESCE(SUM(inventory.physical_quantity - inventory.reserved_quantity), 0) AS available_quantity,
  GREATEST(wo.required_quantity - COALESCE(SUM(inventory.physical_quantity - inventory.reserved_quantity), 0), 0) AS shortage_quantity
FROM work_orders wo
JOIN locations location ON location.id = wo.location_id
JOIN items item ON item.id = wo.item_id
JOIN users assigned ON assigned.id = wo.assigned_user_id
JOIN users creator ON creator.id = wo.created_by_id
LEFT JOIN inventory ON inventory.item_id = wo.item_id AND inventory.location_id = wo.location_id`

const workOrderGroup = 'GROUP BY wo.id, location.id, item.id, assigned.id, creator.id'

async function loadWorkOrder(id, client = null) {
  const executor = client || { query }
  const result = await executor.query(`${workOrderSelect} WHERE wo.id = $1 ${workOrderGroup}`, [id])
  return result.rows[0] || null
}

export const listWorkOrders = asyncHandler(async (request, response) => {
  const params = []
  const clauses = []
  if (request.query.status) {
    if (!statuses.includes(request.query.status)) return failure(response, 'Invalid work order status.', 400)
    params.push(request.query.status)
    clauses.push(`wo.status = $${params.length}`)
  }
  if (request.query.location_id) {
    const locationId = positiveInteger(request.query.location_id)
    if (!locationId) return failure(response, 'location_id must be a positive integer.', 400)
    params.push(locationId)
    clauses.push(`wo.location_id = $${params.length}`)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const countSql = `SELECT COUNT(*)::int AS count FROM work_orders wo ${where}`
  const result = await paginate(`${workOrderSelect} ${where} ${workOrderGroup} ORDER BY wo.created_at DESC`, params, { page: request.query.page || 1, pageSize: request.query.page_size || 25, countSql })
  response.json(result)
})

export const createWorkOrder = asyncHandler(async (request, response) => {
  const locationId = positiveInteger(request.body.location_id)
  const itemId = positiveInteger(request.body.item_id)
  const assignedUserId = positiveInteger(request.body.assigned_user_id)
  const requiredQuantity = positiveQuantity(request.body.required_quantity)
  if (!locationId || !itemId || !assignedUserId || !requiredQuantity) {
    return failure(response, 'Location, item, assigned user, and a positive required quantity are required.', 400)
  }

  const workOrderId = await withTransaction(async (client) => {
    const [location, item, assignedUser] = await Promise.all([
      client.query('SELECT id FROM locations WHERE id = $1', [locationId]),
      client.query('SELECT id FROM items WHERE id = $1 AND is_active = TRUE', [itemId]),
      client.query("SELECT id FROM users WHERE id = $1 AND is_active = TRUE AND role IN ('ADMIN', 'OPERATIONS')", [assignedUserId]),
    ])
    if (!location.rows.length || !item.rows.length || !assignedUser.rows.length) {
      throw Object.assign(new Error('Location, active item, or assignable user was not found.'), { status: 400 })
    }
    const inserted = await client.query(
      `INSERT INTO work_orders (work_order_number, location_id, item_id, required_quantity, assigned_user_id, status, created_by_id)
       VALUES ('PENDING', $1, $2, $3, $4, 'ASSIGNED', $5) RETURNING id`,
      [locationId, itemId, requiredQuantity, assignedUserId, request.user.id],
    )
    const id = inserted.rows[0].id
    await client.query('UPDATE work_orders SET work_order_number = $1, updated_at = NOW() WHERE id = $2', [`WO-${new Date().getUTCFullYear()}-${String(id).padStart(6, '0')}`, id])
    return id
  })

  response.status(201).json(await loadWorkOrder(workOrderId))
})

export const updateWorkOrderStatus = asyncHandler(async (request, response) => {
  const status = request.body.status
  if (!statuses.includes(status)) return failure(response, 'Status must be ASSIGNED, IN_PROGRESS, or COMPLETED.', 400)
  const result = await query('UPDATE work_orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id', [status, request.params.id])
  if (!result.rows.length) return failure(response, 'Work order not found.', 404)
  response.json(await loadWorkOrder(request.params.id))
})
