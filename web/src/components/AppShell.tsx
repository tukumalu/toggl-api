import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const navItems = [
  { to: '/', label: 'Homepage', icon: '\u{1F3E0}', end: true },
  { to: '/dashboard', label: 'Dashboard', icon: '\u{1F4CA}' },
  { to: '/retrospect', label: 'Retrospect', icon: '\u{1F50D}' },
  { to: '/chat', label: 'Chat', icon: '\u{1F4AC}' },
]

export default function AppShell() {
  const { isDemoMode, signOut, user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-layout">
      {/* Mobile header */}
      <div className="mobile-header">
        <span className="brand-title">TIME JOURNAL</span>
        <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay open" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">{'⏱️'}</div>
          <div className="brand-title">TIME JOURNAL</div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              end={item.end}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="status-pill">
            {isDemoMode ? 'Demo Mode' : user?.email ?? 'Signed in'}
          </span>
          {!isDemoMode && (
            <button type="button" onClick={() => void signOut()}>
              Sign out
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
