import { query, pool } from '../config/db.js'

export async function paginate(baseSql, params = [], { page = 1, pageSize = 10, countSql } = {}) {
  const safePage = Math.max(Number(page) || 1, 1)
  const safePageSize = Math.max(Math.min(Number(pageSize) || 10, 100), 1)
  const offset = (safePage - 1) * safePageSize
  const dataSql = `${baseSql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
  const dataResult = await query(dataSql, [...params, safePageSize, offset])
  const totalResult = await query(countSql, params)
  const total = Number(totalResult.rows[0].count)
  return {
    results: dataResult.rows,
    count: total,
    next: offset + safePageSize < total ? safePage + 1 : null,
    previous: safePage > 1 ? safePage - 1 : null,
  }
}

// All stock-changing business flows use this helper so rollbacks stay centralized.
export async function withTransaction(work) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Search terms are expanded into a single ILIKE clause to keep controller code simple.
export function buildSearchClause(fields, value, params) {
  if (!value) return ''
  params.push(`%${value}%`)
  const position = params.length
  return ` AND (${fields.map((field) => `${field} ILIKE $${position}`).join(' OR ')})`
}
