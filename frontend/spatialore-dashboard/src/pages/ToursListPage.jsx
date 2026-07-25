import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TourCard from '../components/tours/TourCard';
import TourFormModal from '../components/tours/TourFormModal';
import { fetchAllTours, createTour, deleteTour } from '../lib/toursApi';
import { useAuth } from '../context/AuthContext';

export default function ToursListPage() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadTours = async () => {
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await fetchAllTours();
    if (error) {
      setErrorMsg(error.message || 'Failed to load tours.');
    } else {
      setTours(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTours();
  }, []);

  const handleCreateTour = async (formValues) => {
    const { data, error } = await createTour({
      ...formValues,
      adminId: session?.user?.id,
    });

    if (error) {
      return { error };
    }

    if (data) {
      setIsModalOpen(false);
      // Navigate directly to the new tour's detail page per workflow spec
      navigate(`/tours/${data.id}`);
    }
    return { data };
  };

  const handleDeleteTour = async (tourId) => {
    const { error } = await deleteTour(tourId);
    if (error) {
      alert(`Failed to delete tour: ${error.message}`);
    } else {
      setTours((prev) => prev.filter((t) => t.id !== tourId));
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Tours</h2>
          <p className="subtitle">Curate city audio walks and geofenced POIs</p>
        </div>

        <button
          className="btn-primary"
          onClick={() => setIsModalOpen(true)}
        >
          + New Tour
        </button>
      </div>

      {errorMsg && (
        <div className="error-banner">
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="placeholder-card">
          <p>Loading tours...</p>
        </div>
      ) : tours.length === 0 ? (
        <div className="placeholder-card">
          <h3>No tours yet</h3>
          <p>Create your first audio tour to get started!</p>
          <button
            className="btn-primary"
            style={{ marginTop: '16px' }}
            onClick={() => setIsModalOpen(true)}
          >
            + Create First Tour
          </button>
        </div>
      ) : (
        <div className="tours-grid">
          {tours.map((tour) => (
            <TourCard key={tour.id} tour={tour} onDelete={handleDeleteTour} />
          ))}
        </div>
      )}

      {isModalOpen && (
        <TourFormModal
          mode="create"
          onSave={handleCreateTour}
          onCancel={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
