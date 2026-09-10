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
  const { user } = useAuth()
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

  if (currentPath === '/login') return <Login navigate={navigate} />
  if (currentPath === '/register') return <Register navigate={navigate} />
  if (currentPath === '/') return <Home navigate={navigate} />
  if (currentPath === '/map') return <MapExplorer navigate={navigate} />
  if (!user) return <Login navigate={navigate} />

  return (
    <MainLayout path={currentPath} navigate={navigate}>
      {currentPath === '/dashboard' ? (
        <Dashboard navigate={navigate} />
      ) : currentPath === '/personalization' ? (
        <Personalization navigate={navigate} />
      ) : currentPath === '/ask-orca' ? (
        <AskOrca key={window.location.search} navigate={navigate} />
      ) : currentPath === '/map-explorer' || currentPath === '/map' ? (
        <MapExplorer navigate={navigate} />
      ) : currentPath === '/alerts' ? (
        <Alerts navigate={navigate} />
      ) : currentPath === '/reports' ? (
        <Reports onNavigate={navigate} />
      ) : (
        <Placeholder title="Page not found" />
      )}
    </MainLayout>
  )
}
