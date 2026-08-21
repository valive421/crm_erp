import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, test } from 'node:test'
import { spawn } from 'node:child_process'
import bcrypt from 'bcryptjs'
import pg from 'pg'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const port = Number(process.env.TEST_PORT || 8123)
const baseUrl = `http://127.0.0.1:${port}/api`

if (!testDatabaseUrl) {
  test('Operations ERP integration suite requires TEST_DATABASE_URL', { skip: 'Set TEST_DATABASE_URL to a disposable PostgreSQL database.' }, () => {})
} else {
  const client = new pg.Client({ connectionString: testDatabaseUrl })
  let server
  let ids

  async function request(path, { method = 'GET', token, body } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    return { status: response.status, body: await response.json() }
  }

  async function login(username, password) {
    const response = await request('/auth/login', { method: 'POST', body: { username, password } })
    assert.equal(response.status, 200)
    return response.body.access
  }

  async function seedDatabase() {
    await client.query('TRUNCATE inventory_transactions, customer_order_items, customer_orders, internal_transfers, work_orders, inventory, batches, items, categories, locations, users RESTART IDENTITY CASCADE')
    const passwordHash = await bcrypt.hash('TestPassword123!', 10)
    const userRows = (await client.query(`INSERT INTO users (username, password_hash, email, role) VALUES
      ('admin', $1, 'admin@test.local', 'ADMIN'), ('operations', $1, 'operations@test.local', 'OPERATIONS'), ('sales', $1, 'sales@test.local', 'SALES')
      RETURNING id, username`, [passwordHash])).rows
    const userId = Object.fromEntries(userRows.map((row) => [row.username, row.id]))
    const categoryId = (await client.query("INSERT INTO categories (name) VALUES ('Test Category') RETURNING id")).rows[0].id
    const locationRows = (await client.query("INSERT INTO locations (name) VALUES ('Source'), ('Destination') RETURNING id, name")).rows
    const locationId = Object.fromEntries(locationRows.map((row) => [row.name, row.id]))
    const itemId = (await client.query("INSERT INTO items (sku, name, category_id) VALUES ('TEST-001', 'Test Item', $1) RETURNING id", [categoryId])).rows[0].id
    const batchId = (await client.query("INSERT INTO batches (item_id, batch_code) VALUES ($1, 'TEST-BATCH') RETURNING id", [itemId])).rows[0].id
    const inventoryRows = (await client.query(`INSERT INTO inventory (item_id, location_id, batch_id, physical_quantity, reserved_quantity)
      VALUES ($1, $2, $3, 10, 0), ($1, $4, $3, 0, 0) RETURNING id, location_id`, [itemId, locationId.Source, batchId, locationId.Destination])).rows
    const inventoryId = Object.fromEntries(inventoryRows.map((row) => [row.location_id, row.id]))
    ids = { userId, locationId, itemId, batchId, sourceInventoryId: inventoryId[locationId.Source], destinationInventoryId: inventoryId[locationId.Destination] }
  }

  before(async () => {
    const schema = await readFile(new URL('../db/001_operations_erp_foundation.sql', import.meta.url), 'utf8')
    await client.connect()
    await client.query(schema)
    server = spawn(process.execPath, ['src/server.js'], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, DATABASE_URL: testDatabaseUrl, PORT: String(port), JWT_ACCESS_SECRET: 'test-access-secret', JWT_REFRESH_SECRET: 'test-refresh-secret', CORS_ORIGIN: '*' },
      stdio: 'ignore',
    })
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        if ((await request('/health')).status === 200) return
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    throw new Error('Test API did not become ready.')
  })

  beforeEach(seedDatabase)
  after(async () => { server?.kill(); await client.end() })

  test('cannot reserve more than available inventory', async () => {
    const salesToken = await login('sales', 'TestPassword123!')
    const response = await request('/orders', { method: 'POST', token: salesToken, body: { customer_name: 'Customer', idempotency_key: 'reserve-too-much', items: [{ inventory_id: ids.sourceInventoryId, quantity: 11 }] } })
    assert.equal(response.status, 400)
    assert.equal((await client.query('SELECT reserved_quantity FROM inventory WHERE id = $1', [ids.sourceInventoryId])).rows[0].reserved_quantity, '0.00')
  })

  test('cannot transfer more than available inventory', async () => {
    const token = await login('operations', 'TestPassword123!')
    const created = await request('/transfers', { method: 'POST', token, body: { source_location_id: ids.locationId.Source, destination_location_id: ids.locationId.Destination, item_id: ids.itemId, batch_id: ids.batchId, quantity: 11 } })
    const dispatched = await request(`/transfers/${created.body.id}/dispatch`, { method: 'POST', token })
    assert.equal(dispatched.status, 400)
  })

  test('destination stock increases only after transfer receipt', async () => {
    const token = await login('operations', 'TestPassword123!')
    const created = await request('/transfers', { method: 'POST', token, body: { source_location_id: ids.locationId.Source, destination_location_id: ids.locationId.Destination, item_id: ids.itemId, batch_id: ids.batchId, quantity: 5 } })
    assert.equal((await client.query('SELECT physical_quantity FROM inventory WHERE id = $1', [ids.destinationInventoryId])).rows[0].physical_quantity, '0.00')
    assert.equal((await request(`/transfers/${created.body.id}/dispatch`, { method: 'POST', token })).status, 200)
    assert.equal((await client.query('SELECT physical_quantity FROM inventory WHERE id = $1', [ids.destinationInventoryId])).rows[0].physical_quantity, '0.00')
    assert.equal((await request(`/transfers/${created.body.id}/receive`, { method: 'POST', token })).status, 200)
    assert.equal((await client.query('SELECT physical_quantity FROM inventory WHERE id = $1', [ids.destinationInventoryId])).rows[0].physical_quantity, '5.00')
  })

  test('same transfer cannot be received twice', async () => {
    const token = await login('operations', 'TestPassword123!')
    const created = await request('/transfers', { method: 'POST', token, body: { source_location_id: ids.locationId.Source, destination_location_id: ids.locationId.Destination, item_id: ids.itemId, batch_id: ids.batchId, quantity: 5 } })
    await request(`/transfers/${created.body.id}/dispatch`, { method: 'POST', token })
    await request(`/transfers/${created.body.id}/receive`, { method: 'POST', token })
    const repeatedReceipt = await request(`/transfers/${created.body.id}/receive`, { method: 'POST', token })
    assert.equal(repeatedReceipt.status, 409)
    assert.equal((await client.query('SELECT physical_quantity FROM inventory WHERE id = $1', [ids.destinationInventoryId])).rows[0].physical_quantity, '5.00')
  })

  test('unauthorized user cannot perform restricted operation', async () => {
    const salesToken = await login('sales', 'TestPassword123!')
    const response = await request('/transfers', { method: 'POST', token: salesToken, body: { source_location_id: ids.locationId.Source, destination_location_id: ids.locationId.Destination, item_id: ids.itemId, batch_id: ids.batchId, quantity: 1 } })
    assert.equal(response.status, 403)
  })
}
