import { env } from '../config/env.js'

function readResponseText(payload) {
  const candidate = payload?.candidates?.[0]
  const parts = candidate?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts
    .map((part) => part?.text || '')
    .join('')
    .trim()
}

export async function generateGeminiReply(message, fetchImpl = globalThis.fetch, operationsContext = null) {
  if (!fetchImpl) {
    const error = new Error('Fetch API is not available.')
    error.status = 500
    throw error
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`

  const contextText = operationsContext
    ? `Live ERP database context (${operationsContext.label}):\n${JSON.stringify(operationsContext.rows, null, 2)}`
    : 'No live ERP database context was requested for this question.'
  const prompt = `You are the operations assistant for a wholesale distribution ERP. Answer the user using the live ERP context when it is provided. Do not claim you cannot access inventory or customer data. If the context has no matching records, say that clearly. Do not invent records or numbers.\n\n${contextText}\n\nUser question: ${message}`

  const upstreamResponse = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }),
  })

  if (!upstreamResponse.ok) {
    const error = new Error('Gemini service is currently unavailable.')
    error.status = 502
    throw error
  }

  const payload = await upstreamResponse.json()
  const reply = readResponseText(payload)
  if (!reply) {
    const error = new Error('Gemini service returned an empty response.')
    error.status = 502
    throw error
  }
  return reply
}
