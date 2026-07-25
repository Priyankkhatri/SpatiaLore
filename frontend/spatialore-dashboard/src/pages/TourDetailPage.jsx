import React from 'react';
import { useParams } from 'react-router-dom';

export default function TourDetailPage() {
  const { tourId } = useParams();

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Tour Detail — ID: {tourId}</h2>
      </div>

      <div className="placeholder-card">
        {/* TODO(Phase 1.3/1.4): OpenStreetMap interactive POI picker map and POI list will render here */}
        <p>Interactive POI map and narration script management will be integrated in Phase 1.3 & 1.4.</p>
      </div>
    </div>
  );
}
