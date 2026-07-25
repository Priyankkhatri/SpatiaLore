import React from 'react';

export default function PoiList({ activatedPois = [], onToggleDeactivate, loading }) {
  if (loading) {
    return (
      <div className="poi-list-card">
        <h3>Tour POIs</h3>
        <p className="list-empty-text">Loading tour POIs...</p>
      </div>
    );
  }

  return (
    <div className="poi-list-card">
      <div className="list-header-row">
        <h3>Tour POIs ({activatedPois.length})</h3>
        <span className="subtitle">Configured geofences and scripts</span>
      </div>

      {activatedPois.length === 0 ? (
        <p className="list-empty-text">
          No POIs activated yet. Click an OpenStreetMap marker on the map to activate your first POI!
        </p>
      ) : (
        <div className="poi-table-container">
          <table className="poi-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Trigger (m)</th>
                <th>Prefetch (m)</th>
                <th>Status</th>
                <th>Script</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activatedPois.map((poi) => (
                <tr key={poi.id} className={!poi.is_active ? 'row-inactive' : ''}>
                  <td className="font-semibold">{poi.name}</td>
                  <td>
                    <span className="badge-category">{poi.category || 'landmark'}</span>
                  </td>
                  <td>{poi.trigger_radius_m}m</td>
                  <td>{poi.prefetch_radius_m}m</td>
                  <td>
                    <span className={`badge-status ${poi.is_active ? 'status-active' : 'status-inactive'}`}>
                      {poi.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {/* TODO(Phase 1.5): Show script status */}
                    <span className="badge-script-pending">No script yet</span>
                  </td>
                  <td>
                    <button
                      className={`btn-sm ${poi.is_active ? 'btn-danger-outline' : 'btn-success-outline'}`}
                      onClick={() => onToggleDeactivate(poi.id, poi.is_active)}
                    >
                      {poi.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
