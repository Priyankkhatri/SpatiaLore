/**
 * Overpass API client for discovering nearby tourism/historic POIs from OpenStreetMap.
 */
export async function fetchOsmPois(lat, lng, radiusMeters = 1500) {
  const overpassUrl = 'https://overpass-api.de/api/interpreter';

  const query = `
    [out:json][timeout:25];
    (
      node["tourism"](around:${radiusMeters},${lat},${lng});
      node["historic"](around:${radiusMeters},${lat},${lng});
      node["amenity"="place_of_worship"](around:${radiusMeters},${lat},${lng});
    );
    out body;
  `;

  try {
    const response = await fetch(overpassUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: query,
    });

    if (!response.ok) {
      throw new Error(`Overpass API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.elements)) {
      return [];
    }

    // Filter out unnamed nodes and normalize payload shape
    const pois = data.elements
      .filter((el) => el.tags && el.tags.name && el.tags.name.trim() !== '')
      .map((el) => ({
        osmId: String(el.id),
        name: el.tags.name,
        category: el.tags.tourism || el.tags.historic || el.tags.amenity || 'landmark',
        lat: el.lat,
        lng: el.lon,
        rawTags: el.tags,
      }));

    // Cap at top 60 POIs to prevent clutter and performance issues
    return pois.slice(0, 60);
  } catch (error) {
    console.error('Error fetching POIs from Overpass API:', error);
    throw new Error('Failed to fetch nearby POIs from OpenStreetMap. Please try again.');
  }
}
