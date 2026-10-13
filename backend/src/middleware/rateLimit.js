import { failure } from '../utils/response.js'

export function createRateLimit({ windowMs = 60_000, maxRequests = 20 } = {}) {
  const requests = new Map()

  return (request, response, next) => {
    const key = request.ip || request.headers['x-forwarded-for'] || 'unknown'
    const now = Date.now()
    const current = requests.get(key)

    if (!current || now > current.expiresAt) {
      requests.set(key, { count: 1, expiresAt: now + windowMs })
      return next()
    }

    if (current.count >= maxRequests) {
      return failure(response, 'Too many requests. Please try again later.', 429)
    }

    current.count += 1
    requests.set(key, current)
    return next()
  }
}
