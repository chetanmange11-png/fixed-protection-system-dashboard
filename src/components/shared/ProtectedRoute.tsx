import * as React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  userRole: string;
  requiredRole: string;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  userRole, 
  requiredRole, 
  children 
}) => {
  if (userRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
