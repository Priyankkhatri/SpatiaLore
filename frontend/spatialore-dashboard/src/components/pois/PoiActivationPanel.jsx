import React, { useState } from 'react';
import { activatePoi } from '../../lib/poisApi';

export default function PoiActivationPanel({ osmPoi, tourId, onActivated, onCancel }) {
  const [triggerRadiusM, setTriggerRadiusM] = useState(30);
  const [prefetchRadiusM, setPrefetchRadiusM] = useState(100);
  const [activating, setActivating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Option (b) validation: Prefetch radius must be >= Trigger radius
  const isInvalidRadius = prefetchRadiusM < triggerRadiusM;

  const handleActivate = async (e) => {
    e.preventDefault();
    if (isInvalidRadius || activating) return;

    setActivating(true);
    setErrorMsg(null);

    const { data, error } = await activatePoi({
      tourId,
      osmPoi,
      triggerRadiusM,
      prefetchRadiusM,
    });

    if (error) {
      let msg = error.message || 'Failed to activate POI. Please try again.';
      // Provide RLS hint if database permissions blocked the insert
      if (error.code === '42501' || msg.includes('row-level security')) {
        msg = 'Insert failed — check that your account has an admin profile (see Phase 0.2 setup).';
      }
      setErrorMsg(msg);
      setActivating(false);
    } else if (data) {
      onActivated(data);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="activation-panel-card">
        <div className="panel-header">
          <h3>Activate Point of Interest</h3>
          <button className="btn-close" onClick={onCancel} disabled={activating}>
            &times;
          </button>
        </div>

        {errorMsg && (
          <div className="error-banner">
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleActivate} className="activation-form">
          <div className="poi-meta-group">
            <div className="meta-item">
              <label>POI Name</label>
              <div className="meta-value-highlight">{osmPoi.name}</div>
            </div>
            <div className="meta-item">
              <label>Category</label>
              <span className="badge-category">{osmPoi.category}</span>
            </div>
          </div>

          <div className="form-group">
            <div className="slider-label-row">
              <label htmlFor="trigger-radius">Trigger Radius (Geofence)</label>
              <span className="radius-value-tag">{triggerRadiusM} meters</span>
            </div>
            <input
              id="trigger-radius"
              type="range"
              min="5"
              max="500"
              step="5"
              value={triggerRadiusM}
              onChange={(e) => setTriggerRadiusM(Number(e.target.value))}
              disabled={activating}
            />
            <span className="slider-help">
              Distance at which hands-free audio narration triggers (5m - 500m).
            </span>
          </div>

          <div className="form-group">
            <div className="slider-label-row">
              <label htmlFor="prefetch-radius">Prefetch Radius (Offline Caching)</label>
              <span className="radius-value-tag">{prefetchRadiusM} meters</span>
            </div>
            <input
              id="prefetch-radius"
              type="range"
              min="20"
              max="1000"
              step="10"
              value={prefetchRadiusM}
              onChange={(e) => setPrefetchRadiusM(Number(e.target.value))}
              disabled={activating}
            />
            <span className="slider-help">
              Distance at which mobile app pre-downloads audio script (20m - 1000m).
            </span>
          </div>

          {isInvalidRadius && (
            <div className="warning-banner">
              ⚠️ Prefetch radius must be ≥ trigger radius ({triggerRadiusM}m).
            </div>
          )}

          <div className="panel-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={activating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isInvalidRadius || activating}
            >
              {activating ? 'Activating POI...' : 'Activate POI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
