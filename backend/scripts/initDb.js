import { readFile } from 'node:fs/promises'
import { query, pool } from '../src/config/db.js'

async function run() {
  const schema = await readFile(new URL('../db/001_operations_erp_foundation.sql', import.meta.url), 'utf8')
  await query(schema)
  console.log('Operations ERP foundation schema is ready.')
}

run()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
