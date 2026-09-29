type GeocodeResult = {
  latitude: number | null;
  longitude: number | null;
};

const GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';
const PLACES_SEARCH_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

function getGeocodingKey() {
  return (
    process.env.GOOGLE_MAPS_SERVER_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    null
  );
}

function getRefererHeader() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000/';
}

export async function geocodeAddressServer(address: string): Promise<GeocodeResult> {
  const apiKey = getGeocodingKey();
  const trimmed = address?.trim();
  if (!apiKey || !trimmed) {
    return { latitude: null, longitude: null };
  }

  // 1. Try Google Places New searchText (works seamlessly with referer-restricted API keys)
  try {
    const placesResponse = await fetch(PLACES_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.location',
        'Referer': getRefererHeader(),
      },
      body: JSON.stringify({ textQuery: trimmed }),
    });

    if (placesResponse.ok) {
      const placesData = await placesResponse.json();
      const loc = placesData?.places?.[0]?.location;
      if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        return {
          latitude: loc.latitude,
          longitude: loc.longitude,
        };
      }
    }
  } catch (err) {
    console.warn('Places searchText geocoding attempt failed, trying Geocode REST endpoint:', err);
  }

  // 2. Fallback to standard Geocoding REST API (for server-specific unrestricted keys)
  try {
    const response = await fetch(
      `${GEOCODE_ENDPOINT}?address=${encodeURIComponent(trimmed)}&key=${apiKey}`,
      {
        headers: {
          'Referer': getRefererHeader(),
        },
      }
    );

    const data = await response.json();
    if (data.status === 'OK' && data.results?.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat as number,
        longitude: location.lng as number,
      };
    }
  } catch (error) {
    console.error('Google geocoding request failed:', error);
  }

  return { latitude: null, longitude: null };
}
