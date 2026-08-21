import { asyncHandler } from '../utils/asyncHandler.js'
import { failure } from '../utils/response.js'
import { paginate, withTransaction } from '../services/dbHelpers.js'
import { query } from '../config/db.js'

function positiveInteger(value) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function positiveQuantity(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

async function loadOrder(id, client = null) {
  const executor = client || { query }
  const orderResult = await executor.query(`SELECT customer_order.id, customer_order.order_number, customer_order.customer_name, customer_order.status,
      customer_order.created_at, customer_order.updated_at, creator.username AS created_by_username
    FROM customer_orders customer_order
    JOIN users creator ON creator.id = customer_order.created_by_id
    WHERE customer_order.id = $1`, [id])
  const order = orderResult.rows[0]
  if (!order) return null
  const itemResult = await executor.query(`SELECT order_item.id, order_item.quantity, inventory.id AS inventory_id,
      item.sku, item.name AS item_name, location.name AS location_name, batch.batch_code
    FROM customer_order_items order_item
    JOIN inventory ON inventory.id = order_item.inventory_id
    JOIN items item ON item.id = inventory.item_id
    JOIN locations location ON location.id = inventory.location_id
    JOIN batches batch ON batch.id = inventory.batch_id
    WHERE order_item.customer_order_id = $1 ORDER BY order_item.id ASC`, [id])
  return { ...order, items: itemResult.rows }
}

export const listOrders = asyncHandler(async (request, response) => {
  const params = []
  const where = request.query.status ? 'WHERE customer_order.status = $1' : ''
  if (request.query.status) {
    if (!['RESERVED', 'CANCELLED'].includes(request.query.status)) return failure(response, 'Invalid order status.', 400)
    params.push(request.query.status)
  }
  const result = await paginate(`SELECT customer_order.id, customer_order.order_number, customer_order.customer_name, customer_order.status,
      customer_order.created_at, creator.username AS created_by_username,
      COALESCE(SUM(order_item.quantity), 0) AS total_reserved_quantity
    FROM customer_orders customer_order
    JOIN users creator ON creator.id = customer_order.created_by_id
    LEFT JOIN customer_order_items order_item ON order_item.customer_order_id = customer_order.id
    ${where}
    GROUP BY customer_order.id, creator.id
    ORDER BY customer_order.created_at DESC`, params, {
    page: request.query.page || 1,
    pageSize: request.query.page_size || 25,
    countSql: `SELECT COUNT(*)::int AS count FROM customer_orders customer_order ${where}`,
  })
  response.json(result)
})

export const createOrder = asyncHandler(async (request, response) => {
  const customerName = String(request.body.customer_name || '').trim()
  const idempotencyKey = String(request.body.idempotency_key || '').trim()
  const items = Array.isArray(request.body.items) ? request.body.items : []
  if (!customerName || !idempotencyKey || !items.length || idempotencyKey.length > 100) {
    return failure(response, 'Customer name, idempotency key, and at least one order item are required.', 400)
  }
  const normalizedItems = items.map((item) => ({ inventoryId: positiveInteger(item.inventory_id), quantity: positiveQuantity(item.quantity) }))
  if (normalizedItems.some((item) => !item.inventoryId || !item.quantity)) return failure(response, 'Every order item requires an inventory record and positive quantity.', 400)
  if (new Set(normalizedItems.map((item) => item.inventoryId)).size !== normalizedItems.length) return failure(response, 'Each inventory record can appear only once in an order.', 400)

  const orderId = await withTransaction(async (client) => {
    const duplicate = await client.query('SELECT id FROM customer_orders WHERE idempotency_key = $1 FOR UPDATE', [idempotencyKey])
    if (duplicate.rows.length) throw Object.assign(new Error('Duplicate order request.'), { status: 409 })

    const lockedItems = []
    for (const item of [...normalizedItems].sort((left, right) => left.inventoryId - right.inventoryId)) {
      const inventoryResult = await client.query(`SELECT id, physical_quantity, reserved_quantity
        FROM inventory WHERE id = $1 FOR UPDATE`, [item.inventoryId])
      const inventory = inventoryResult.rows[0]
      if (!inventory) throw Object.assign(new Error('Inventory record not found.'), { status: 404 })
      if (Number(inventory.physical_quantity) - Number(inventory.reserved_quantity) < item.quantity) {
        throw Object.assign(new Error('Reservation exceeds available inventory.'), { status: 400 })
      }
      lockedItems.push({ ...item, inventory })
    }

    const inserted = await client.query(`INSERT INTO customer_orders (order_number, customer_name, status, created_by_id, idempotency_key)
      VALUES ('PENDING', $1, 'RESERVED', $2, $3)
      ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`, [customerName, request.user.id, idempotencyKey])
    if (!inserted.rows.length) throw Object.assign(new Error('Duplicate order request.'), { status: 409 })
    const id = inserted.rows[0].id
    await client.query('UPDATE customer_orders SET order_number = $1, updated_at = NOW() WHERE id = $2', [`SO-${new Date().getUTCFullYear()}-${String(id).padStart(6, '0')}`, id])

    for (const item of lockedItems) {
      await client.query('UPDATE inventory SET reserved_quantity = reserved_quantity + $1, updated_at = NOW() WHERE id = $2', [item.quantity, item.inventoryId])
      await client.query('INSERT INTO customer_order_items (customer_order_id, inventory_id, quantity) VALUES ($1, $2, $3)', [id, item.inventoryId, item.quantity])
      await client.query(`INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, idempotency_key, reference_type, reference_id, created_by_id)
        VALUES ($1, 'RESERVATION', $2, $3, 'CUSTOMER_ORDER', $4, $5)`, [item.inventoryId, item.quantity, `order-reservation-${id}-${item.inventoryId}`, id, request.user.id])
    }
    return id
  })
  response.status(201).json(await loadOrder(orderId))
})

export const cancelOrder = asyncHandler(async (request, response) => {
  const orderId = positiveInteger(request.params.id)
  if (!orderId) return failure(response, 'Order ID must be a positive integer.', 400)
  await withTransaction(async (client) => {
    const orderResult = await client.query('SELECT id, status FROM customer_orders WHERE id = $1 FOR UPDATE', [orderId])
    const order = orderResult.rows[0]
    if (!order) throw Object.assign(new Error('Customer order not found.'), { status: 404 })
    if (order.status !== 'RESERVED') throw Object.assign(new Error('Only reserved orders can be cancelled.'), { status: 409 })
    const items = (await client.query('SELECT inventory_id, quantity FROM customer_order_items WHERE customer_order_id = $1 ORDER BY inventory_id FOR UPDATE', [orderId])).rows
    for (const item of items) {
      const inventoryResult = await client.query('SELECT id, reserved_quantity FROM inventory WHERE id = $1 FOR UPDATE', [item.inventory_id])
      const inventory = inventoryResult.rows[0]
      if (!inventory || Number(inventory.reserved_quantity) < Number(item.quantity)) throw Object.assign(new Error('Inventory reservation is inconsistent.'), { status: 409 })
      await client.query('UPDATE inventory SET reserved_quantity = reserved_quantity - $1, updated_at = NOW() WHERE id = $2', [item.quantity, item.inventory_id])
      await client.query(`INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, idempotency_key, reference_type, reference_id, created_by_id)
        VALUES ($1, 'RESERVATION_RELEASE', $2, $3, 'CUSTOMER_ORDER', $4, $5)`, [item.inventory_id, item.quantity, `order-release-${orderId}-${item.inventory_id}`, orderId, request.user.id])
    }
    await client.query("UPDATE customer_orders SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1", [orderId])
  })
  response.json(await loadOrder(orderId))
})
