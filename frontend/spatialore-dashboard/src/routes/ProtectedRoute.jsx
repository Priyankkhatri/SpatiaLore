import React from 'react';

// TODO(Phase 1.2): Check Supabase Auth session.
// In Phase 1.2, this component will check for an active user session via supabase.auth.getSession().
// If unauthenticated, it will redirect to /login using <Navigate to="/login" replace />.
// For now, it acts as a pass-through component rendering its child routes/components directly.

export default function ProtectedRoute({ children }) {
  return children;
}
