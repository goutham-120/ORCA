import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAuth } from '../../hooks/useAuth'

export default function MainLayout({ children, path, navigate }) {
  const { logout } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev)
  const closeSidebar = () => setIsSidebarOpen(false)

  // Close sidebar on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        closeSidebar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSidebarOpen])

  // Automatically close sidebar when navigating to a new route
  useEffect(() => {
    closeSidebar()
  }, [path])

  const leave = () => {
    logout()
    navigate('/')
  }

  return (
    <div className={`app-shell font-sans ${isSidebarOpen ? 'sidebar-is-open' : 'sidebar-is-closed'}`}>
      {/* Backdrop overlay when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <Sidebar
        path={path}
        navigate={navigate}
        onLogout={leave}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        onToggle={toggleSidebar}
      />

      <div className="workspace">
        <Header
          navigate={navigate}
          onToggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}
