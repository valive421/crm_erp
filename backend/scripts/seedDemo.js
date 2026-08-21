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

  console.log('Demo seed executed successfully.')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
