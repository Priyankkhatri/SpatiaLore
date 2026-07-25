import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const displayName = profile?.full_name || session?.user?.email || 'Admin';

  return (
    <header className="app-header">
      <div className="header-brand">
        <h1>SpatiaLore Admin</h1>
      </div>
      <div className="header-actions">
        <span className="user-profile-tag">
          {displayName}
        </span>
        <button className="btn-logout" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </header>
  );
}
