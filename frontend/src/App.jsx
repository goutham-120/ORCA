import { useEffect, useState } from 'react'
import MainLayout from './components/layout/MainLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import './App.css'

const titles = { '/ask-orca': 'Ask ORCA', '/map-explorer': 'Map Explorer', '/alerts': 'Alerts', '/reports': 'Reports' }
function Placeholder({ title }) { return <section className="feature-placeholder"><span>◒</span><h1>{title}</h1><p>This workspace is ready for its ORCA module to connect.</p></section> }

export default function App() {
  const [location, setLocation] = useState(() => window.location)
  useEffect(() => { const listener = () => setLocation(window.location); window.addEventListener('popstate', listener); return () => window.removeEventListener('popstate', listener) }, [])
  const navigate = (to) => { window.history.pushState({}, '', to); setLocation(window.location); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const path = location.pathname === '/' ? '/dashboard' : location.pathname
  if (path === '/login') return <Login navigate={navigate} />
  if (path === '/register') return <Register navigate={navigate} />
  return <MainLayout path={path} navigate={navigate}>{path === '/dashboard' ? <Dashboard navigate={navigate} /> : <Placeholder title={titles[path] || 'Page not found'} />}</MainLayout>
}
