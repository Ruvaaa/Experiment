import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
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

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 } },
})

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:pl-0">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<DashboardPage />} />
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
