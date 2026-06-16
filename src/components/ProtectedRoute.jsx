import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, role } = useAuth();

  if (!user) {
    // No está logueado
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && role !== 'admin') {
    // Está logueado pero no tiene permisos de administrador
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
