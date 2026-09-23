import { useEffect, useState } from 'react'
import MainLayout from './components/layout/MainLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AskOrca from './pages/AskOrca'
import MapExplorer from './pages/MapExplorer'
import Alerts from './pages/Alerts'
import { Reports } from './pages/Reports'
import Home from './pages/Home'
import Personalization from './pages/Personalization'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminProtectedRoute from './components/auth/AdminProtectedRoute'
import { useAuth } from './hooks/useAuth'
import './App.css'

function Placeholder({ title }) {
  return (
    <section className="feature-placeholder">
      <span>◒</span>
      <h1>{title}</h1>
      <p>This workspace is ready for its ORCA module to connect.</p>
    </section>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const [currentPath, setCurrentPath] = useState(() => {
    return window.location.pathname
  })

  useEffect(() => {
    const listener = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener('popstate', listener)
    return () => window.removeEventListener('popstate', listener)
  }, [])

  const navigate = (to) => {
    window.history.pushState({}, '', to)

    const url = new URL(to, window.location.origin)
    setCurrentPath(url.pathname)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (currentPath === '/admin/login') return <AdminLogin navigate={navigate} />
  if (currentPath === '/admin' || currentPath === '/admin/dashboard') {
    return (
      <AdminProtectedRoute navigate={navigate}>
        <AdminDashboard navigate={navigate} />
      </AdminProtectedRoute>
    )
  }

  if (currentPath === '/login') return <Login navigate={navigate} />
  if (currentPath === '/register') return <Register navigate={navigate} />
  if (currentPath === '/') return <Home navigate={navigate} />

  if (currentPath === '/map' || currentPath === '/map-explorer') {
    if (user) {
      return (
        <MainLayout path={currentPath} navigate={navigate}>
          <MapExplorer key={window.location.search} navigate={navigate} />
        </MainLayout>
      )
    }
    return <MapExplorer key={window.location.search} navigate={navigate} />
  }

  return (
    <ProtectedRoute navigate={navigate}>
      <MainLayout path={currentPath} navigate={navigate}>
        {currentPath === '/dashboard' ? (
          <Dashboard navigate={navigate} />
        ) : currentPath === '/personalization' ? (
          <Personalization navigate={navigate} />
        ) : currentPath === '/ask-orca' ? (
          <AskOrca key={window.location.search} navigate={navigate} />
        ) : currentPath === '/alerts' ? (
          <Alerts navigate={navigate} />
        ) : currentPath === '/reports' ? (
          <Reports onNavigate={navigate} />
        ) : (
          <Placeholder title="Page not found" />
        )}
      </MainLayout>
    </ProtectedRoute>
  )
}


