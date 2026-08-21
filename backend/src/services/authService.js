import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../config/db.js'
import { env } from '../config/env.js'

const refreshTokens = new Map()

// The demo keeps refresh tokens in memory so the API can rotate and revoke them.
export async function findUserByUsername(username) {
  const result = await query('SELECT id, username, password_hash AS password, first_name, last_name, email, role, is_active FROM users WHERE username = $1 LIMIT 1', [username])
  return result.rows[0] || null
}

export function toUserPayload(user) {
  if (!user) return null
  return {
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
  }
}

export async function loginUser(username, password) {
  const user = await findUserByUsername(username)
  if (!user) return null
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return null
  const payload = toUserPayload(user)
  const access = jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpiresIn })
  const refresh = jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiresIn })
  refreshTokens.set(refresh, payload)
  return { access, refresh, user: payload }
}

export function refreshAccessToken(refreshToken) {
  const stored = refreshTokens.get(refreshToken)
  if (!stored) return null
  const payload = jwt.verify(refreshToken, env.jwtRefreshSecret)
  const access = jwt.sign(toUserPayload(payload), env.jwtAccessSecret, { expiresIn: env.jwtAccessExpiresIn })
  return { access, refresh: refreshToken, user: toUserPayload(payload) }
}

export function revokeRefreshToken(refreshToken) {
  refreshTokens.delete(refreshToken)
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret)
}

// The frontend uses /auth/me to hydrate the active session after refresh.
export async function getCurrentUser(userId) {
  const result = await query('SELECT id, username, first_name, last_name, email, role, is_active FROM users WHERE id = $1 LIMIT 1', [userId])
  return result.rows[0] || null
}
