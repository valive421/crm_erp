import { useState } from 'react'
import { chatApi } from '../services/api'

export default function GeminiChatPage() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sendMessage = async (event) => {
    event.preventDefault()
    const text = message.trim()
    if (!text || loading) return

    setLoading(true)
    setError('')
    setMessage('')
    setMessages((current) => [...current, { role: 'user', text }])

    try {
      const response = await chatApi.askGemini(text)
      const reply = response.data?.reply || 'No response received.'
      setMessages((current) => [...current, { role: 'assistant', text: reply }])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Chat request failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-stack">
      <div className="panel header-row">
        <div>
          <h2>Gemini Chatbot</h2>
          <p>Ask operations questions and receive AI replies from the secure backend endpoint.</p>
        </div>
      </div>

      <section className="panel chat-log" aria-live="polite">
        {messages.length === 0 ? <p className="empty-state">Start by asking Gemini a question.</p> : null}
        {messages.map((item, index) => (
          <div key={`${item.role}-${index}`} className={`chat-message ${item.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}>
            <strong>{item.role === 'user' ? 'You' : 'Gemini'}</strong>
            <p>{item.text}</p>
          </div>
        ))}
      </section>

      <form className="panel form-grid" onSubmit={sendMessage}>
        <label className="form-field">
          <span>Message</span>
          <textarea
            required
            rows={4}
            maxLength={2000}
            placeholder="Type your question..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        {error ? <div className="error-banner">{error}</div> : null}
        <button className="primary-button" disabled={loading}>
          {loading ? 'Sending...' : 'Send to Gemini'}
        </button>
      </form>
    </div>
  )
}
