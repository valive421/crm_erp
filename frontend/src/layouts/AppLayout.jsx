import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Boxes, ClipboardList, LayoutDashboard, Menu, MessageCircle, Package, Users, UserCircle, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const navGroups = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
  { label: 'Customers', to: '/customers', icon: Users, roles: ['ADMIN', 'SALES', 'ACCOUNTS'] },
  { label: 'Products', to: '/products', icon: Package, roles: ['ADMIN', 'WAREHOUSE', 'ACCOUNTS', 'SALES'] },
  { label: 'Inventory', to: '/inventory', icon: Boxes, roles: ['ADMIN', 'WAREHOUSE'] },
  { label: 'Challans', to: '/challans', icon: ClipboardList, roles: ['ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE'] },
  { label: 'Profile', to: '/profile', icon: UserCircle, roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  // The sidebar is filtered by role so each user sees only the modules they can use.
  const items = navGroups.filter((item) => item.roles.includes(user?.role))
  const currentPage = items.find((item) => location.pathname.startsWith(item.to))?.label || 'Operations'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div>
          <div className="brand-row">
            <div className="brand">Mini ERP CRM</div>
            <button className="icon-button sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation">
              <X size={19} aria-hidden="true" />
            </button>
          </div>
          <div className="sidebar-subtitle">Operations Portal</div>
        </div>
        <nav className="nav-list">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <item.icon size={18} strokeWidth={2.1} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="secondary-button sign-out-button" onClick={handleLogout}>Sign out</button>
      </aside>
      {menuOpen ? <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setMenuOpen(false)} /> : null}
      <div className="main-panel">
        <header className="topbar">
          <div className="topbar-heading">
            <button className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
              <Menu size={21} aria-hidden="true" />
            </button>
            <div>
              <span className="eyebrow">Wholesale Distribution ERP</span>
              <h1>{currentPage}</h1>
              <p>Manage your day-to-day operations with confidence.</p>
            </div>
          </div>
          <div className="topbar-actions">
            <NavLink
              to="/chatbot"
              className={({ isActive }) => `icon-button ${isActive ? 'active' : ''}`}
              aria-label="Open Gemini Chatbot"
              title="Open Gemini Chatbot"
            >
              <MessageCircle size={20} strokeWidth={2.2} aria-hidden="true" />
            </NavLink>
            <div className="user-chip"><UserCircle size={18} aria-hidden="true" /><span>{user?.username}</span><small>{user?.role}</small></div>
          </div>
        </header>
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
