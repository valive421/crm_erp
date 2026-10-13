import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from '../src/config/db.js'

const directory = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.join(directory, '..', 'db', '001_initial_schema.sql')

try {
  const schema = await fs.readFile(schemaPath, 'utf8')
  await pool.query(schema)
  console.log('Database schema initialized successfully.')
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await pool.end()
}
