import React, { useState } from 'react';

export default function PublishToggle({
  tourId,
  isPublished,
  activePoiCount = 0,
  onTogglePublish,
}) {
  const [updating, setUpdating] = useState(false);

  const handleToggle = async () => {
    let confirmMsg = '';

    if (!isPublished) {
      if (activePoiCount === 0) {
        confirmMsg =
          'This tour has no active POIs yet. Publishing now will show an empty tour to travelers. Continue anyway?';
      } else {
        confirmMsg = 'This will make the tour visible to the mobile app. Continue?';
      }
    } else {
      confirmMsg =
        'This will hide the tour from the mobile app immediately. Continue?';
    }

    const confirmed = window.confirm(confirmMsg);
    if (!confirmed) return;

    setUpdating(true);
    await onTogglePublish(!isPublished);
    setUpdating(false);
  };

  return (
    <div className="publish-toggle-container">
      <span
        className={`badge-status ${
          isPublished ? 'status-active' : 'status-inactive'
        }`}
      >
        {isPublished ? 'Live / Published' : 'Draft / Unpublished'}
      </span>

      <button
        type="button"
        className={`btn-sm ${
          isPublished ? 'btn-danger-outline' : 'btn-success-outline'
        }`}
        onClick={handleToggle}
        disabled={updating}
      >
        {updating ? 'Updating...' : isPublished ? 'Unpublish Tour' : 'Publish Tour'}
      </button>
    </div>
  );
}
