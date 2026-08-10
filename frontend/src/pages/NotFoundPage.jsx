import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Page not found</h2>
        <p>The requested route does not exist.</p>
        <Link className="primary-button" to="/dashboard">Go to dashboard</Link>
      </div>
    </div>
  )
}
