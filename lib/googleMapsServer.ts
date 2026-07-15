type GeocodeResult = {
  latitude: number | null;
  longitude: number | null;
};

const GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

function getServerGeocodingKey() {
  return process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY || null;
}

export async function geocodeAddressServer(address: string): Promise<GeocodeResult> {
  const apiKey = getServerGeocodingKey();
  if (!apiKey || !address) {
    return { latitude: null, longitude: null };
  }

  try {
    const response = await fetch(
      `${GEOCODE_ENDPOINT}?address=${encodeURIComponent(address)}&key=${apiKey}`
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
