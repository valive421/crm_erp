import pg from 'pg'
import { env } from './env.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseUrl && !env.databaseUrl.includes('localhost') ? { rejectUnauthorized: false } : false,
})

export async function query(text, params) {
  const start = Date.now()
  const result = await pool.query(text, params)
  result.durationMs = Date.now() - start
  return result
}
