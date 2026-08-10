import { asyncHandler } from '../utils/asyncHandler.js'
import { failure } from '../utils/response.js'
import { paginate, withTransaction } from '../services/dbHelpers.js'
import { query } from '../config/db.js'

// Challan responses always include the header row plus all item snapshots.
async function loadChallan(id) {
  const challanResult = await query('SELECT sc.id, sc.challan_number, sc.customer_id AS customer, c.name AS customer_name, sc.total_quantity, sc.status, sc.created_by_id AS created_by, u.username AS created_by_username, sc.created_at, sc.updated_at FROM challans_saleschallan sc JOIN customers_customer c ON c.id = sc.customer_id LEFT JOIN accounts_user u ON u.id = sc.created_by_id WHERE sc.id = $1 LIMIT 1', [id])
  if (!challanResult.rows.length) return null
  const itemsResult = await query('SELECT id, challan_id, product_id AS product, product_id_snapshot, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity FROM challans_saleschallanitem WHERE challan_id = $1 ORDER BY id ASC', [id])
  return { ...challanResult.rows[0], items: itemsResult.rows }
}

export const listChallans = asyncHandler(async (request, response) => {
  const params = []
  const clauses = []
  if (request.query.search) {
    params.push(`%${request.query.search}%`)
    clauses.push(`(sc.challan_number ILIKE $${params.length} OR c.name ILIKE $${params.length})`)
  }
  if (request.query.status) {
    params.push(request.query.status)
    clauses.push(`sc.status = $${params.length}`)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const baseSql = `SELECT sc.id, sc.challan_number, sc.customer_id AS customer, c.name AS customer_name, sc.total_quantity, sc.status, sc.created_by_id AS created_by, u.username AS created_by_username, sc.created_at, sc.updated_at FROM challans_saleschallan sc JOIN customers_customer c ON c.id = sc.customer_id LEFT JOIN accounts_user u ON u.id = sc.created_by_id ${where} ORDER BY sc.created_at DESC`
  const countSql = `SELECT COUNT(*)::int AS count FROM challans_saleschallan sc JOIN customers_customer c ON c.id = sc.customer_id ${where}`
  const result = await paginate(baseSql, params, { page: request.query.page || 1, pageSize: request.query.page_size || 10, countSql })
  for (const challan of result.results) {
    const itemsResult = await query('SELECT id, challan_id, product_id AS product, product_id_snapshot, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity FROM challans_saleschallanitem WHERE challan_id = $1 ORDER BY id ASC', [challan.id])
    challan.items = itemsResult.rows
  }
  return response.json(result)
})

export const createChallan = asyncHandler(async (request, response) => {
  const { customer, items = [], status = 'DRAFT' } = request.body
  if (!customer || !items.length) return failure(response, 'Customer and items are required.', 400)
  const challan = await withTransaction(async (client) => {
    // Insert first, then derive the human-readable challan number from the row id.
    const inserted = await client.query('INSERT INTO challans_saleschallan (challan_number, customer_id, total_quantity, status, created_by_id, created_at, updated_at) VALUES ($1,$2,0,$3,$4,NOW(),NOW()) RETURNING id', ['TMP', customer, status, request.user.id])
    const challanId = inserted.rows[0].id
    const challanNumber = `SC-2026-${String(challanId).padStart(6, '0')}`
    let totalQuantity = 0
    for (const item of items) {
      const productResult = await client.query('SELECT * FROM products_product WHERE id = $1 FOR UPDATE', [item.product])
      const product = productResult.rows[0]
      if (!product) throw Object.assign(new Error(`Product ${item.product} not found.`), { status: 400 })
      const quantity = Number(item.quantity)
      if (!Number.isInteger(quantity) || quantity <= 0) throw Object.assign(new Error('Quantity must be greater than zero.'), { status: 400 })
      totalQuantity += quantity
      await client.query('INSERT INTO challans_saleschallanitem (challan_id, product_id, product_id_snapshot, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity) VALUES ($1,$2,$3,$4,$5,$6,$7)', [challanId, product.id, product.id, product.name, product.sku, product.unit_price, quantity])
    }
    await client.query('UPDATE challans_saleschallan SET challan_number = $1, total_quantity = $2, updated_at = NOW() WHERE id = $3', [challanNumber, totalQuantity, challanId])
    if (status === 'CONFIRMED') {
      // Confirming a challan is atomic: every stock deduction and movement must succeed.
      for (const item of items) {
        const productResult = await client.query('SELECT * FROM products_product WHERE id = $1 FOR UPDATE', [item.product])
        const product = productResult.rows[0]
        const quantity = Number(item.quantity)
        if (Number(product.current_stock) < quantity) {
          throw Object.assign(new Error(`Insufficient stock for ${product.name}.`), { status: 400, available: Number(product.current_stock), requested: quantity })
        }
        await client.query('UPDATE products_product SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2', [quantity, product.id])
        await client.query('INSERT INTO inventory_stockmovement (product_id, quantity_changed, movement_type, reason, created_by_id, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW())', [product.id, quantity, 'OUT', `Challan ${challanNumber}`, request.user.id])
      }
    }
    const loaded = await loadChallan(challanId)
    return loaded
  })
  return response.status(201).json(challan)
})

export const getChallan = asyncHandler(async (request, response) => {
  const challan = await loadChallan(request.params.id)
  if (!challan) return failure(response, 'Challan not found.', 404)
  return response.json(challan)
})

export const updateChallan = asyncHandler(async (request, response) => {
  const current = await loadChallan(request.params.id)
  if (!current) return failure(response, 'Challan not found.', 404)
  if (current.status !== 'DRAFT') return failure(response, 'Only draft challans can be edited.', 400)
  const { customer, items = [] } = request.body
  if (!customer || !items.length) return failure(response, 'Customer and items are required.', 400)
  const updated = await withTransaction(async (client) => {
    // Draft edits replace the full item set so the stored snapshot stays consistent.
    await client.query('DELETE FROM challans_saleschallanitem WHERE challan_id = $1', [request.params.id])
    let totalQuantity = 0
    for (const item of items) {
      const productResult = await client.query('SELECT * FROM products_product WHERE id = $1 FOR UPDATE', [item.product])
      const product = productResult.rows[0]
      if (!product) throw Object.assign(new Error(`Product ${item.product} not found.`), { status: 400 })
      const quantity = Number(item.quantity)
      if (!Number.isInteger(quantity) || quantity <= 0) throw Object.assign(new Error('Quantity must be greater than zero.'), { status: 400 })
      totalQuantity += quantity
      await client.query('INSERT INTO challans_saleschallanitem (challan_id, product_id, product_id_snapshot, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity) VALUES ($1,$2,$3,$4,$5,$6,$7)', [request.params.id, product.id, product.id, product.name, product.sku, product.unit_price, quantity])
    }
    await client.query('UPDATE challans_saleschallan SET customer_id = $1, total_quantity = $2, updated_at = NOW() WHERE id = $3', [customer, totalQuantity, request.params.id])
    return loadChallan(request.params.id)
  })
  return response.json(updated)
})

export const deleteChallan = asyncHandler(async (request, response) => {
  const current = await loadChallan(request.params.id)
  if (!current) return failure(response, 'Challan not found.', 404)
  await query('UPDATE challans_saleschallan SET status = $1, updated_at = NOW() WHERE id = $2', ['CANCELLED', request.params.id])
  return response.json({ success: true, message: 'Challan cancelled successfully.' })
})

export const confirmChallan = asyncHandler(async (request, response) => {
  const current = await loadChallan(request.params.id)
  if (!current) return failure(response, 'Challan not found.', 404)
  if (current.status === 'CONFIRMED') return response.json(current)
  const confirmed = await withTransaction(async (client) => {
    // Re-check stock under row locks so concurrent confirmations cannot oversell.
    for (const item of current.items) {
      const productResult = await client.query('SELECT * FROM products_product WHERE id = $1 FOR UPDATE', [item.product])
      const product = productResult.rows[0]
      const quantity = Number(item.quantity)
      if (Number(product.current_stock) < quantity) {
        throw Object.assign(new Error(`Insufficient stock for ${product.name}.`), { status: 400, available: Number(product.current_stock), requested: quantity })
      }
      await client.query('UPDATE products_product SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2', [quantity, product.id])
      await client.query('INSERT INTO inventory_stockmovement (product_id, quantity_changed, movement_type, reason, created_by_id, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW())', [product.id, quantity, 'OUT', `Challan ${current.challan_number}`, request.user.id])
    }
    await client.query('UPDATE challans_saleschallan SET status = $1, updated_at = NOW() WHERE id = $2', ['CONFIRMED', request.params.id])
    return loadChallan(request.params.id)
  })
  return response.json(confirmed)
})

export const cancelChallan = asyncHandler(async (request, response) => {
  const current = await loadChallan(request.params.id)
  if (!current) return failure(response, 'Challan not found.', 404)
  await query('UPDATE challans_saleschallan SET status = $1, updated_at = NOW() WHERE id = $2', ['CANCELLED', request.params.id])
  return response.json({ success: true, message: 'Challan cancelled successfully.' })
})
