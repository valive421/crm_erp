import { asyncHandler } from '../utils/asyncHandler.js'
import { failure } from '../utils/response.js'
import { paginate, withTransaction } from '../services/dbHelpers.js'

const inventoryFields = `
  i.id, i.item_id, item.sku, item.name AS item_name, item.category_id, category.name AS category_name,
  i.location_id, location.name AS location_name, i.batch_id, batch.batch_code,
  i.physical_quantity, i.reserved_quantity,
  (i.physical_quantity - i.reserved_quantity) AS available_quantity,
  i.created_at, i.updated_at
`

function positiveQuantity(value) {
  const quantity = Number(value)
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null
}

function optionalPositiveInteger(value) {
  if (value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : false
}

export const listInventory = asyncHandler(async (request, response) => {
  const params = []
  const clauses = []
  const locationId = optionalPositiveInteger(request.query.location_id)
  const categoryId = optionalPositiveInteger(request.query.category_id)
  const itemId = optionalPositiveInteger(request.query.item_id)

  if ([locationId, categoryId, itemId].includes(false)) return failure(response, 'Filters must be positive integer IDs.', 400)
  if (locationId) {
    params.push(locationId)
    clauses.push(`i.location_id = $${params.length}`)
  }
  if (categoryId) {
    params.push(categoryId)
    clauses.push(`item.category_id = $${params.length}`)
  }
  if (itemId) {
    params.push(itemId)
    clauses.push(`i.item_id = $${params.length}`)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const joins = 'FROM inventory i JOIN items item ON item.id = i.item_id JOIN categories category ON category.id = item.category_id JOIN locations location ON location.id = i.location_id JOIN batches batch ON batch.id = i.batch_id'
  const result = await paginate(
    `SELECT ${inventoryFields} ${joins} ${where} ORDER BY item.name ASC, location.name ASC, batch.batch_code ASC`,
    params,
    { page: request.query.page || 1, pageSize: request.query.page_size || 25, countSql: `SELECT COUNT(*)::int AS count ${joins} ${where}` },
  )
  response.json(result)
})

export const listTransactions = asyncHandler(async (request, response) => {
  const result = await paginate(
    `SELECT tx.id, tx.transaction_type, tx.quantity, tx.idempotency_key, tx.reference_type, tx.reference_id, tx.created_at,
      inventory.id AS inventory_id, item.sku, item.name AS item_name, location.name AS location_name, batch.batch_code,
      user_account.username AS created_by_username
     FROM inventory_transactions tx
     JOIN inventory ON inventory.id = tx.inventory_id
     JOIN items item ON item.id = inventory.item_id
     JOIN locations location ON location.id = inventory.location_id
     JOIN batches batch ON batch.id = inventory.batch_id
     JOIN users user_account ON user_account.id = tx.created_by_id
     ORDER BY tx.created_at DESC`,
    [],
    { page: request.query.page || 1, pageSize: request.query.page_size || 25, countSql: 'SELECT COUNT(*)::int AS count FROM inventory_transactions' },
  )
  response.json(result)
})

export const createAdjustment = asyncHandler(async (request, response) => {
  const inventoryId = optionalPositiveInteger(request.body.inventory_id)
  const quantity = positiveQuantity(request.body.quantity)
  const direction = request.body.direction
  const idempotencyKey = String(request.body.idempotency_key || '').trim()

  if (!inventoryId || !quantity || !['IN', 'OUT'].includes(direction) || !idempotencyKey) {
    return failure(response, 'Inventory, a positive quantity, direction, and idempotency key are required.', 400)
  }
  if (idempotencyKey.length > 100) return failure(response, 'Idempotency key must be 100 characters or fewer.', 400)

  const adjusted = await withTransaction(async (client) => {
    const duplicate = await client.query('SELECT id FROM inventory_transactions WHERE idempotency_key = $1 FOR UPDATE', [idempotencyKey])
    if (duplicate.rows.length) throw Object.assign(new Error('Duplicate inventory transaction.'), { status: 409 })

    const inventoryResult = await client.query(`SELECT ${inventoryFields}
      FROM inventory i
      JOIN items item ON item.id = i.item_id
      JOIN categories category ON category.id = item.category_id
      JOIN locations location ON location.id = i.location_id
      JOIN batches batch ON batch.id = i.batch_id
      WHERE i.id = $1 FOR UPDATE`, [inventoryId])
    const inventory = inventoryResult.rows[0]
    if (!inventory) throw Object.assign(new Error('Inventory record not found.'), { status: 404 })

    const availableQuantity = Number(inventory.physical_quantity) - Number(inventory.reserved_quantity)
    if (direction === 'OUT' && availableQuantity < quantity) {
      throw Object.assign(new Error('Insufficient available inventory for this adjustment.'), { status: 400 })
    }

    const physicalQuantity = direction === 'IN'
      ? Number(inventory.physical_quantity) + quantity
      : Number(inventory.physical_quantity) - quantity
    const updateResult = await client.query(
      `UPDATE inventory
       SET physical_quantity = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, physical_quantity, reserved_quantity, (physical_quantity - reserved_quantity) AS available_quantity, updated_at`,
      [physicalQuantity, inventoryId],
    )
    const transactionResult = await client.query(
      `INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, idempotency_key, reference_type, created_by_id)
       VALUES ($1, $2, $3, $4, 'MANUAL_ADJUSTMENT', $5)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING id, transaction_type, quantity, created_at`,
      [inventoryId, direction === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT', quantity, idempotencyKey, request.user.id],
    )
    if (!transactionResult.rows.length) throw Object.assign(new Error('Duplicate inventory transaction.'), { status: 409 })

    return { inventory: updateResult.rows[0], transaction: transactionResult.rows[0] }
  })

  response.status(201).json(adjusted)
})
