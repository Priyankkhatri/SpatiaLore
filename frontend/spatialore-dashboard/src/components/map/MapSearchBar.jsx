import React, { useState } from 'react';

/**
 * MapSearchBar uses OpenStreetMap's Nominatim geocoding service.
 * Nominatim Usage Policy Note: Low-volume usage (~1 req/sec max).
 * Only trigger on explicit user submit (form onSubmit), never on every keystroke.
 */
export default function MapSearchBar({ onCityFound }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setErrorMsg(null);

    try {
      // Custom app query param appended per Nominatim policy guidelines
      const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query.trim()
      )}&limit=1&appName=SpatiaLoreAdmin`;

      const res = await fetch(searchUrl);
      if (!res.ok) {
        throw new Error(`Nominatim request failed with status ${res.status}`);
      }

      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        onCityFound({
          lat: parseFloat(lat),
          lng: parseFloat(lon),
          displayName: display_name,
        });
      } else {
        setErrorMsg(`City or location "${query}" not found. Please try another search.`);
      }
    } catch (err) {
      console.error('Nominatim Geocoding Error:', err);
      setErrorMsg('Geocoding request failed. Please check your network connection.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="map-search-container">
      <form onSubmit={handleSearch} className="map-search-form">
        <input
          type="text"
          className="map-search-input"
          placeholder="Search city or location (e.g. Jaipur, Paris, Rome)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={searching}
        />
        <button type="submit" className="btn-primary" disabled={searching || !query.trim()}>
          {searching ? 'Searching...' : 'Search Location'}
        </button>
      </form>

      {errorMsg && <p className="search-error-text">{errorMsg}</p>}
    </div>
  );
}
