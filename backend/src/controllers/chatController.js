import { env } from '../config/env.js'
import { generateGeminiReply } from '../services/geminiService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { failure } from '../utils/response.js'

const MAX_MESSAGE_LENGTH = 2000

export const askGemini = asyncHandler(async (request, response) => {
  const rawMessage = request.body?.message
  const message = typeof rawMessage === 'string' ? rawMessage.trim() : ''

  if (!message) {
    return failure(response, 'Message is required.', 400)
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return failure(response, `Message is too long. Maximum length is ${MAX_MESSAGE_LENGTH} characters.`, 400)
  }

  if (!env.geminiApiKey) {
    return failure(response, 'Gemini chatbot is not configured. Set GEMINI_API_KEY on the server.', 503)
  }

  const reply = await generateGeminiReply(message)
  return response.json({ success: true, reply })
})
