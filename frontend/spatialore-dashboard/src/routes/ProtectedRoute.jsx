import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-spinner-container">
        <div className="loading-spinner"></div>
        <p>Verifying authentication & permissions...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <h2>Access Denied</h2>
          <p>
            Your account is authenticated but not authorized as an admin. Contact
            your system administrator to be added to the profiles table.
          </p>
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
}
