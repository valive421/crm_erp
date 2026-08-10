export function notFoundHandler(request, response) {
  response.status(404).json({ success: false, message: 'Route not found.' })
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) return next(error)
  const status = error.status || 500
  const message = error.message || 'Internal server error.'
  response.status(status).json({ success: false, message, errors: error.errors || null })
}
