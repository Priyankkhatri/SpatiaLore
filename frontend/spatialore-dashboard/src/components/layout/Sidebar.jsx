import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-logo">
        <span className="logo-text">SpatiaLore</span>
        <span className="logo-badge">Admin</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink 
          to="/" 
          end
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Tours
        </NavLink>

        <div className="nav-item disabled" title="Coming Soon">
          Analytics <span className="badge-soon">Coming Soon</span>
        </div>

        <div className="nav-item disabled" title="Coming Soon">
          Settings <span className="badge-soon">Coming Soon</span>
        </div>
      </nav>
    </aside>
  );
}
