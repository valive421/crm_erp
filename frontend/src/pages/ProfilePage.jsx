import { useAuth } from '../context/AuthContext'

export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="panel">
      <h2>Profile</h2>
      <div className="detail-grid">
        <div><strong>Username</strong><span>{user?.username}</span></div>
        <div><strong>Role</strong><span>{user?.role}</span></div>
        <div><strong>Email</strong><span>{user?.email || '-'}</span></div>
      </div>
    </div>
  )
}
