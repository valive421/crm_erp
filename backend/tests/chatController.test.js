import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import { env } from '../src/config/env.js'
import { askGemini } from '../src/controllers/chatController.js'

const originalFetch = globalThis.fetch
const originalGeminiKey = env.geminiApiKey

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

async function runAskGemini(request) {
  const response = createResponse()
  let nextError = null

  await new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve()
    }

    const wrappedResponse = {
      ...response,
      status(code) {
        response.status(code)
        return wrappedResponse
      },
      json(payload) {
        response.json(payload)
        finish()
        return wrappedResponse
      },
    }

    askGemini(request, wrappedResponse, (error) => {
      nextError = error
      finish()
    })

    setTimeout(finish, 0)
  })

  return { response, nextError }
}

afterEach(() => {
  globalThis.fetch = originalFetch
  env.geminiApiKey = originalGeminiKey
})

test('returns 400 when message is missing', async () => {
  env.geminiApiKey = 'test-key'
  const { response } = await runAskGemini({ body: {} })
  assert.equal(response.statusCode, 400)
  assert.equal(response.body.success, false)
})

test('returns 503 when Gemini key is not configured', async () => {
  env.geminiApiKey = ''
  const { response } = await runAskGemini({ body: { message: 'Hello' } })
  assert.equal(response.statusCode, 503)
  assert.equal(response.body.success, false)
})

test('returns Gemini reply on success', async () => {
  env.geminiApiKey = 'test-key'
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return { candidates: [{ content: { parts: [{ text: 'Hello from Gemini' }] } }] }
    },
  })

  const { response, nextError } = await runAskGemini({ body: { message: 'Hi' } })

  assert.equal(nextError, null)
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body, { success: true, reply: 'Hello from Gemini' })
})

test('passes upstream errors to next middleware', async () => {
  env.geminiApiKey = 'test-key'
  globalThis.fetch = async () => ({ ok: false, async json() { return {} } })

  const { nextError } = await runAskGemini({ body: { message: 'Hi' } })
  assert.equal(nextError?.status, 502)
})
