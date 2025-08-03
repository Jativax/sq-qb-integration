import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { apiClient } from '../services/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component that checks for authentication
 * Redirects to login page if user is not authenticated
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = apiClient.isAuthenticated();

  if (!isAuthenticated) {
    // Redirect to login page with return path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
