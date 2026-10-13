import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navGroups = [
  { label: 'Dashboard', to: '/dashboard', roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
  { label: 'Customers', to: '/customers', roles: ['ADMIN', 'SALES', 'ACCOUNTS'] },
  { label: 'Products', to: '/products', roles: ['ADMIN', 'WAREHOUSE', 'ACCOUNTS', 'SALES'] },
  { label: 'Inventory', to: '/inventory', roles: ['ADMIN', 'WAREHOUSE'] },
  { label: 'Challans', to: '/challans', roles: ['ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE'] },
  { label: 'Profile', to: '/profile', roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  // The sidebar is filtered by role so each user sees only the modules they can use.
  const items = navGroups.filter((item) => item.roles.includes(user?.role))

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">Mini ERP CRM</div>
          <div className="sidebar-subtitle">Operations Portal</div>
        </div>
        <nav className="nav-list">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="secondary-button" onClick={handleLogout}>Sign out</button>
      </aside>
      <div className="main-panel">
        <header className="topbar">
          <div>
            <h1>Wholesale Distribution ERP</h1>
            <p>Role: {user?.role}</p>
          </div>
          <div className="user-chip">{user?.username}</div>
        </header>
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
