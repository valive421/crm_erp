import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('Admin@12345')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(username, password)
      navigate('/inventory')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand large">Mini Operations ERP</div>
        <h2>Secure access for operations teams</h2>
        <p>Sign in with your role-based demo account.</p>
        <form onSubmit={handleSubmit} className="stack-form">
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error ? <div className="error-banner">{error}</div> : null}
          <button className="primary-button" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
        </form>
      </div>
    </div>
  )
}
