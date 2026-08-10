export const success = (res, message, data = null, status = 200) => {
  res.status(status).json({ success: true, message, data })
}

export const failure = (res, message, status = 400, data = null) => {
  res.status(status).json({ success: false, message, data })
}
