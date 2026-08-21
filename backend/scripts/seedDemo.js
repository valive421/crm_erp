import bcrypt from 'bcryptjs'
import { query } from '../src/config/db.js'

async function run() {
  const users = [
    ['admin', 'ADMIN', 'admin@example.com', 'Admin@12345', true],
    ['sales1', 'SALES', 'sales@example.com', 'Sales@12345', false],
    ['operations1', 'OPERATIONS', 'operations@example.com', 'Operations@12345', false],
  ]

  for (const [username, role, email, password] of users) {
    const passwordHash = await bcrypt.hash(password, 10)
    await query(
      `INSERT INTO users (username, password_hash, first_name, last_name, email, role, is_active, created_at, updated_at)
       VALUES ($1, $2, '', '', $3, $4, TRUE, NOW(), NOW())
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, email = EXCLUDED.email, updated_at = NOW()`,
      [username, passwordHash, email, role],
    )
  }

  const categories = ['Components', 'Packaging', 'Finished Goods']
  for (const name of categories) {
    await query(
      'INSERT INTO categories (name, created_at, updated_at) VALUES ($1, NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET updated_at = NOW()',
      [name],
    )
  }

  const locations = [
    ['Main Operations Hub', 'Industrial Area'],
    ['Regional Distribution Centre', 'Downtown'],
  ]
  for (const [name, address] of locations) {
    await query(
      'INSERT INTO locations (name, address, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET address = EXCLUDED.address, updated_at = NOW()',
      [name, address],
    )
  }

  const itemSeeds = [
    ['COMP-001', 'Control Panel Assembly', 'Components', 'UNIT', 'BATCH-CP-001', 120],
    ['PACK-001', 'Industrial Packaging Kit', 'Packaging', 'UNIT', 'BATCH-PK-001', 80],
    ['FG-001', 'Finished Controller', 'Finished Goods', 'UNIT', 'BATCH-FG-001', 45],
  ]
  const locationRows = (await query('SELECT id, name FROM locations ORDER BY id ASC')).rows
  const admin = (await query("SELECT id FROM users WHERE username = 'admin' LIMIT 1")).rows[0]

  for (const [sku, name, categoryName, unitOfMeasure, batchCode, openingQuantity] of itemSeeds) {
    const category = (await query('SELECT id FROM categories WHERE name = $1', [categoryName])).rows[0]
    const item = (await query(
      `INSERT INTO items (sku, name, category_id, unit_of_measure, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id, unit_of_measure = EXCLUDED.unit_of_measure, updated_at = NOW()
       RETURNING id`,
      [sku, name, category.id, unitOfMeasure],
    )).rows[0]
    const batch = (await query(
      `INSERT INTO batches (item_id, batch_code, received_at, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW(), NOW())
       ON CONFLICT (item_id, batch_code) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [item.id, batchCode],
    )).rows[0]

    for (const [index, location] of locationRows.entries()) {
      const quantity = index === 0 ? openingQuantity : openingQuantity / 2
      const inventory = (await query(
        `INSERT INTO inventory (item_id, location_id, batch_id, physical_quantity, reserved_quantity, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 0, NOW(), NOW())
         ON CONFLICT (item_id, location_id, batch_id) DO UPDATE SET updated_at = NOW()
         RETURNING id`,
        [item.id, location.id, batch.id, quantity],
      )).rows[0]
      await query(
        `INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, idempotency_key, reference_type, created_by_id)
         VALUES ($1, 'OPENING_BALANCE', $2, $3, 'DEMO_SEED', $4)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [inventory.id, quantity, `seed-opening-${inventory.id}`, admin.id],
      )
    }
  }

  console.log('Demo seed executed successfully.')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
