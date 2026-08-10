import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { failure } from '../utils/response.js'

export function authenticate(request, response, next) {
  // Access tokens are sent as Bearer headers from the React client.
  const header = request.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return failure(response, 'Unauthorized.', 401)
  try {
    request.user = jwt.verify(token, env.jwtAccessSecret)
    return next()
  } catch {
    return failure(response, 'Unauthorized.', 401)
  }
}

export function authorize(...roles) {
  return (request, response, next) => {
    // Admin bypass keeps the demo manageable while still enforcing normal role gates.
    if (!request.user) return failure(response, 'Unauthorized.', 401)
    if (request.user.role === 'ADMIN' || roles.includes(request.user.role)) return next()
    return failure(response, 'Forbidden.', 403)
  }
}
