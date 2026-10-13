import { env } from '../config/env.js'

const GEMINI_MODEL = 'gemini-2.0-flash'

function readResponseText(payload) {
  const candidate = payload?.candidates?.[0]
  const parts = candidate?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts
    .map((part) => part?.text || '')
    .join('')
    .trim()
}

export async function generateGeminiReply(message, fetchImpl = globalThis.fetch) {
  if (!fetchImpl) {
    const error = new Error('Fetch API is not available.')
    error.status = 500
    throw error
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`

  const upstreamResponse = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: message }] }],
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
