import { asyncHandler } from '../utils/asyncHandler.js'
import { failure, success } from '../utils/response.js'
import { loginUser, refreshAccessToken, revokeRefreshToken, getCurrentUser } from '../services/authService.js'

export const login = asyncHandler(async (request, response) => {
  const { username, password } = request.body
  if (!username || !password) {
    return failure(response, 'Username and password are required.', 400)
  }
  const result = await loginUser(username, password)
  if (!result) return failure(response, 'Invalid username or password.', 401)
  return response.json({ access: result.access, refresh: result.refresh, user: result.user })
})

export const refresh = asyncHandler(async (request, response) => {
  const { refresh: refreshToken } = request.body
  if (!refreshToken) return failure(response, 'Refresh token is required.', 400)
  const result = refreshAccessToken(refreshToken)
  if (!result) return failure(response, 'Invalid refresh token.', 401)
  return response.json(result)
})

export const logout = asyncHandler(async (request, response) => {
  const { refresh: refreshToken } = request.body
  if (refreshToken) revokeRefreshToken(refreshToken)
  return success(response, 'Logged out successfully.')
})

export const me = asyncHandler(async (request, response) => {
  const user = await getCurrentUser(request.user.id)
  if (!user) return failure(response, 'User not found.', 404)
  return response.json(user)
})
