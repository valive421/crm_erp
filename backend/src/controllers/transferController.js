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

const transferSelect = `SELECT transfer.id, transfer.transfer_number, transfer.quantity, transfer.status, transfer.created_at, transfer.dispatched_at, transfer.received_at,
  source.id AS source_location_id, source.name AS source_location_name,
  destination.id AS destination_location_id, destination.name AS destination_location_name,
  item.id AS item_id, item.sku, item.name AS item_name,
  batch.id AS batch_id, batch.batch_code,
  requester.username AS requested_by_username, dispatcher.username AS dispatched_by_username, receiver.username AS received_by_username
FROM internal_transfers transfer
JOIN locations source ON source.id = transfer.source_location_id
JOIN locations destination ON destination.id = transfer.destination_location_id
JOIN items item ON item.id = transfer.item_id
JOIN batches batch ON batch.id = transfer.batch_id
JOIN users requester ON requester.id = transfer.requested_by_id
LEFT JOIN users dispatcher ON dispatcher.id = transfer.dispatched_by_id
LEFT JOIN users receiver ON receiver.id = transfer.received_by_id`

async function loadTransfer(id, client = null) {
  const executor = client || { query }
  const result = await executor.query(`${transferSelect} WHERE transfer.id = $1`, [id])
  return result.rows[0] || null
}

export const listTransfers = asyncHandler(async (request, response) => {
  const params = []
  const where = request.query.status ? 'WHERE transfer.status = $1' : ''
  if (request.query.status) {
    if (!['REQUESTED', 'DISPATCHED', 'RECEIVED'].includes(request.query.status)) return failure(response, 'Invalid transfer status.', 400)
    params.push(request.query.status)
  }
  const result = await paginate(`${transferSelect} ${where} ORDER BY transfer.created_at DESC`, params, {
    page: request.query.page || 1,
    pageSize: request.query.page_size || 25,
    countSql: `SELECT COUNT(*)::int AS count FROM internal_transfers transfer ${where}`,
  })
  response.json(result)
})

export const createTransfer = asyncHandler(async (request, response) => {
  const sourceLocationId = positiveInteger(request.body.source_location_id)
  const destinationLocationId = positiveInteger(request.body.destination_location_id)
  const itemId = positiveInteger(request.body.item_id)
  const batchId = positiveInteger(request.body.batch_id)
  const quantity = positiveQuantity(request.body.quantity)
  if (!sourceLocationId || !destinationLocationId || !itemId || !batchId || !quantity || sourceLocationId === destinationLocationId) {
    return failure(response, 'Distinct source and destination locations, item, batch, and a positive quantity are required.', 400)
  }
  const transferId = await withTransaction(async (client) => {
    const batch = await client.query('SELECT id FROM batches WHERE id = $1 AND item_id = $2', [batchId, itemId])
    const locations = await client.query('SELECT id FROM locations WHERE id = ANY($1::bigint[])', [[sourceLocationId, destinationLocationId]])
    if (!batch.rows.length || locations.rows.length !== 2) throw Object.assign(new Error('Batch, item, or location was not found.'), { status: 400 })
    const inserted = await client.query(
      `INSERT INTO internal_transfers (transfer_number, source_location_id, destination_location_id, item_id, batch_id, quantity, status, requested_by_id)
       VALUES ('PENDING', $1, $2, $3, $4, $5, 'REQUESTED', $6) RETURNING id`,
      [sourceLocationId, destinationLocationId, itemId, batchId, quantity, request.user.id],
    )
    const id = inserted.rows[0].id
    await client.query('UPDATE internal_transfers SET transfer_number = $1, updated_at = NOW() WHERE id = $2', [`TR-${new Date().getUTCFullYear()}-${String(id).padStart(6, '0')}`, id])
    return id
  })
  response.status(201).json(await loadTransfer(transferId))
})

export const dispatchTransfer = asyncHandler(async (request, response) => {
  const transferId = positiveInteger(request.params.id)
  if (!transferId) return failure(response, 'Transfer ID must be a positive integer.', 400)
  await withTransaction(async (client) => {
    const transferResult = await client.query('SELECT * FROM internal_transfers WHERE id = $1 FOR UPDATE', [transferId])
    const transfer = transferResult.rows[0]
    if (!transfer) throw Object.assign(new Error('Transfer not found.'), { status: 404 })
    if (transfer.status !== 'REQUESTED') throw Object.assign(new Error('Only requested transfers can be dispatched.'), { status: 409 })
    const inventoryResult = await client.query('SELECT * FROM inventory WHERE item_id = $1 AND location_id = $2 AND batch_id = $3 FOR UPDATE', [transfer.item_id, transfer.source_location_id, transfer.batch_id])
    const inventory = inventoryResult.rows[0]
    if (!inventory || Number(inventory.physical_quantity) - Number(inventory.reserved_quantity) < Number(transfer.quantity)) {
      throw Object.assign(new Error('Insufficient available inventory at the source location.'), { status: 400 })
    }
    await client.query('UPDATE inventory SET physical_quantity = physical_quantity - $1, updated_at = NOW() WHERE id = $2', [transfer.quantity, inventory.id])
    await client.query(`INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, idempotency_key, reference_type, reference_id, created_by_id)
      VALUES ($1, 'TRANSFER_DISPATCH', $2, $3, 'INTERNAL_TRANSFER', $4, $5)`, [inventory.id, transfer.quantity, `transfer-dispatch-${transfer.id}`, transfer.id, request.user.id])
    await client.query("UPDATE internal_transfers SET status = 'DISPATCHED', dispatched_by_id = $1, dispatched_at = NOW(), updated_at = NOW() WHERE id = $2", [request.user.id, transfer.id])
  })
  response.json(await loadTransfer(transferId))
})

export const receiveTransfer = asyncHandler(async (request, response) => {
  const transferId = positiveInteger(request.params.id)
  if (!transferId) return failure(response, 'Transfer ID must be a positive integer.', 400)
  await withTransaction(async (client) => {
    const transferResult = await client.query('SELECT * FROM internal_transfers WHERE id = $1 FOR UPDATE', [transferId])
    const transfer = transferResult.rows[0]
    if (!transfer) throw Object.assign(new Error('Transfer not found.'), { status: 404 })
    if (transfer.status !== 'DISPATCHED') throw Object.assign(new Error('Only dispatched transfers can be received.'), { status: 409 })
    const destinationResult = await client.query(
      `INSERT INTO inventory (item_id, location_id, batch_id, physical_quantity, reserved_quantity)
       VALUES ($1, $2, $3, $4, 0)
       ON CONFLICT (item_id, location_id, batch_id)
       DO UPDATE SET physical_quantity = inventory.physical_quantity + EXCLUDED.physical_quantity, updated_at = NOW()
       RETURNING id`,
      [transfer.item_id, transfer.destination_location_id, transfer.batch_id, transfer.quantity],
    )
    const destinationInventoryId = destinationResult.rows[0].id
    await client.query(`INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, idempotency_key, reference_type, reference_id, created_by_id)
      VALUES ($1, 'TRANSFER_RECEIPT', $2, $3, 'INTERNAL_TRANSFER', $4, $5)`, [destinationInventoryId, transfer.quantity, `transfer-receipt-${transfer.id}`, transfer.id, request.user.id])
    await client.query("UPDATE internal_transfers SET status = 'RECEIVED', received_by_id = $1, received_at = NOW(), updated_at = NOW() WHERE id = $2", [request.user.id, transfer.id])
  })
  response.json(await loadTransfer(transferId))
})
