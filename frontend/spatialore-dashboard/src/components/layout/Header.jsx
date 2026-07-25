import React from 'react';

export default function Header() {
  const handleLogout = () => {
    // TODO(Phase 1.2): Wire up supabase.auth.signOut() to clear session and redirect to /login
    console.log('Logout clicked - Supabase Auth integration planned for Phase 1.2');
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <h1>SpatiaLore Admin</h1>
      </div>
      <div className="header-actions">
        <button className="btn-logout" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </header>
  );
}
