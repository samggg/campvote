import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Setup from './pages/admin/Setup'
import Debug from './pages/Debug'


// Páginas
import Login         from './pages/Login'
import AdminLogin    from './pages/AdminLogin'
import Categories    from './pages/Categories'
import Vote          from './pages/Vote'
import Success       from './pages/Success'
import Dashboard     from './pages/admin/Dashboard'
import Participants  from './pages/admin/Participants'
import Results       from './pages/admin/Results'
import Export        from './pages/admin/Export'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/admin/login" replace />
  if (!user.isAdmin) return <Navigate to="/categorias" replace />
  return <>{children}</>
}

function RootRedirect() {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.isAdmin) return <Navigate to="/admin/dashboard" replace />
  return <Navigate to="/categorias" replace />
}

export default function App() {
  const restoreSession = useAuthStore(s => s.restoreSession)
  useEffect(() => { restoreSession() }, [restoreSession])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login"       element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/setup" element={<Setup />} />
        <Route path="/debug" element={<Debug />} />
        <Route path="/categorias" element={<RequireAuth><Categories /></RequireAuth>} />
        <Route path="/votar/:categoryId" element={<RequireAuth><Vote /></RequireAuth>} />
        <Route path="/sucesso" element={<RequireAuth><Success /></RequireAuth>} />
        <Route path="/admin/dashboard"     element={<RequireAdmin><Dashboard /></RequireAdmin>} />
        <Route path="/admin/participantes" element={<RequireAdmin><Participants /></RequireAdmin>} />
        <Route path="/admin/resultados"    element={<RequireAdmin><Results /></RequireAdmin>} />
        <Route path="/admin/exportar"      element={<RequireAdmin><Export /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}