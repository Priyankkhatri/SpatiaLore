import React from 'react';

export default function ToursListPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Tours</h2>
          <p className="subtitle">Manage city audio tours and interactive POIs</p>
        </div>

        {/* TODO(Phase 1.6): Wire up modal or page form for creating a new tour */}
        <button className="btn-primary" disabled title="Coming in Phase 1.6">
          + New Tour
        </button>
      </div>

      <div className="placeholder-card">
        <p>No tours loaded yet — Supabase integration comes in Phase 1.2.</p>
      </div>
    </div>
  );
}
