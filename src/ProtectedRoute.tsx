import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ 
  children, 
  requiredRole 
}: { 
  children: React.ReactNode; 
  requiredRole?: string 
}) {
  const { user, profile, loading, isAdmin, isStaff, isSafa, isStudent, isAcademic } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-800"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const hasAccess = () => {
    if (isAdmin) return true;
    if (requiredRole === 'admin') return isAdmin;
    if (requiredRole === 'staff') return isStaff;
    if (requiredRole === 'academic') return isAcademic || isStaff;
    if (requiredRole === 'safa') return isSafa;
    if (requiredRole === 'student') return isStudent;
    return true;
  };

  if (requiredRole && !hasAccess()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
