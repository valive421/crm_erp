import bcrypt from 'bcryptjs'
import { query } from '../src/config/db.js'

async function run() {
  const users = [
    ['admin', 'ADMIN', 'admin@example.com', 'Admin@12345', true],
    ['sales1', 'SALES', 'sales@example.com', 'Sales@12345', false],
    ['warehouse1', 'WAREHOUSE', 'warehouse@example.com', 'Warehouse@12345', false],
    ['accounts1', 'ACCOUNTS', 'accounts@example.com', 'Accounts@12345', false],
  ]

  for (const [username, role, email, password, isAdmin] of users) {
    const passwordHash = await bcrypt.hash(password, 10)
    await query(
      `INSERT INTO accounts_user (password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined, role, created_at, updated_at)
       VALUES ($1, NULL, $2, $3, '', '', $4, $5, TRUE, NOW(), $6, NOW(), NOW())
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role, email = EXCLUDED.email, updated_at = NOW()`,
      [passwordHash, isAdmin, username, email, isAdmin, role],
    )
  }

  const categories = ['Beverages', 'Snacks', 'Stationery', 'Household', 'Electronics']
  for (const name of categories) {
    await query(
      'INSERT INTO products_category (name, created_at, updated_at) VALUES ($1, NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET updated_at = NOW()',
      [name],
    )
  }

  const warehouses = [
    ['Main Warehouse', 'Industrial Area'],
    ['City Warehouse', 'Downtown'],
  ]
  for (const [name, location] of warehouses) {
    await query(
      'INSERT INTO products_warehouse (name, location, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET location = EXCLUDED.location, updated_at = NOW()',
      [name, location],
    )
  }

  console.log('Demo seed executed successfully.')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
