import Sidebar from './Sidebar'
import Header from './Header'
import { useAuth } from '../../hooks/useAuth'

export default function MainLayout({ children, path, navigate }) {
  const { logout } = useAuth()
  const leave = () => {
    logout()
    navigate('/login')
  }
  return (
    <div className="app-shell font-sans">
      <Sidebar path={path} navigate={navigate} onLogout={leave} />
      <div className="workspace">
        <Header navigate={navigate} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}
