import React from 'react';
import { Link } from 'react-router-dom';

export default function TourCard({ tour, onDelete }) {
  const formattedDate = new Date(tour.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleDeleteClick = (e) => {
    e.preventDefault();
    const confirmed = window.confirm(
      `This will permanently delete "${tour.name}" and all its POIs and scripts. This cannot be undone.\n\nAre you sure?`
    );
    if (confirmed && onDelete) {
      onDelete(tour.id);
    }
  };

  return (
    <div className="tour-card">
      <div className="tour-card-header">
        <h3 className="tour-card-title">{tour.name}</h3>
        <span
          className={`badge-status ${
            tour.is_published ? 'status-active' : 'status-inactive'
          }`}
        >
          {tour.is_published ? 'Published' : 'Draft'}
        </span>
      </div>

      <div className="tour-card-location">
        <span>📍 {tour.city}{tour.country ? `, ${tour.country}` : ''}</span>
      </div>

      <p className="tour-card-description">
        {tour.description || 'No description provided.'}
      </p>

      <div className="tour-card-footer">
        <span className="tour-card-date">Created {formattedDate}</span>

        <div className="tour-card-actions">
          <button
            type="button"
            className="btn-danger-outline btn-sm"
            onClick={handleDeleteClick}
            title="Delete Tour"
          >
            Delete
          </button>
          <Link to={`/tours/${tour.id}`} className="btn-primary btn-sm">
            View / Edit
          </Link>
        </div>
      </div>
    </div>
  );
}
