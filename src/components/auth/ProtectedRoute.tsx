import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/hooks/useAuth'
import { PageSpinner } from '../ui/Spinner'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageSpinner />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}
