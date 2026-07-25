import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import LoginPage from '../pages/LoginPage';
import ToursListPage from '../pages/ToursListPage';
import TourDetailPage from '../pages/TourDetailPage';
import NotFoundPage from '../pages/NotFoundPage';

// NOTE: Single Page App (SPA) redirect configuration for hosting deployments (Netlify/Vercel) will be added in Phase 1.7.

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ToursListPage />} />
        <Route path="tours/:tourId" element={<TourDetailPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
