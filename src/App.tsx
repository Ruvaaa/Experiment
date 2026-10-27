import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { Sidebar } from './components/layout/Sidebar'
import LoginPage from './pages/auth/LoginPage'
import SignUpPage from './pages/auth/SignUpPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import ExperimentsPage from './pages/ExperimentsPage'
import ExperimentDetailPage from './pages/ExperimentDetailPage'
import ComparePage from './pages/ComparePage'
import AnalyticsPage from './pages/AnalyticsPage'
import DatasetsPage from './pages/DatasetsPage'
import ModelsPage from './pages/ModelsPage'
import NotesPage from './pages/NotesPage'
import SettingsPage from './pages/SettingsPage'
import LandingPage from './pages/LandingPage'
import { FloatingNeuralNetwork } from './components/FloatingNeuralNetwork'
import { useAuth } from './lib/hooks/useAuth'
import { takeAuthDestination } from './lib/authRedirect'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 } },
})

function AppLayout() {
  return (
    <div className="app-layout relative flex min-h-screen overflow-x-hidden bg-[#0A0A0A] text-[#F5F5F5]">
      <FloatingNeuralNetwork density="app" className="fixed z-[1] opacity-100" />
      <div className="relative z-20 flex-shrink-0"><Sidebar /></div>
      <main className="relative z-10 flex-1 min-w-0 lg:ml-60 bg-transparent">
        <Outlet />
      </main>
    </div>
  )
}

function LandingRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const oauthError = new URLSearchParams(location.search).get('error_description') || new URLSearchParams(location.search).get('error')
  if (loading) return null
  if (oauthError) return <Navigate to={`/login?${new URLSearchParams(location.search).toString()}`} replace />
  if (user) return <Navigate to={takeAuthDestination('/dashboard')} replace />
  return <LandingPage />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingRoute />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/experiments" element={<ExperimentsPage />} />
                <Route path="/experiments/:id" element={<ExperimentDetailPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/datasets" element={<DatasetsPage />} />
                <Route path="/models" element={<ModelsPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
