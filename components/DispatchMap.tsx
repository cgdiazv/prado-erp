'use client';

import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

interface MapStop {
  id: string;
  street_address: string;
  latitude: number | null;
  longitude: number | null;
  job_type: string;
}

export default function DispatchMap({ stops }: { stops: MapStop[] }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const defaultCenter = { lat: 29.7604, lng: -95.3698 };
  const validStops = stops.filter(stop => stop.latitude !== null && stop.longitude !== null);

  return (
    <APIProvider apiKey={apiKey}>
      <div className="w-full h-64 rounded-xl overflow-hidden border border-gray-200 shadow-inner bg-gray-100">
        {apiKey ? (
          <Map
            defaultCenter={validStops[0] ? { lat: Number(validStops[0].latitude), lng: Number(validStops[0].longitude) } : defaultCenter}
            defaultZoom={12}
            gestureHandling={'cooperative'}
            disableDefaultUI={false}
          >
            {validStops.map((stop, idx) => (
              <Marker
                key={stop.id}
                position={{ lat: Number(stop.latitude), lng: Number(stop.longitude) }}
                // This cleanly places just the number centered inside the standard pin icon
                label={{ text: String(idx + 1), color: '#ffffff', fontWeight: 'bold' }}
              />
            ))}
          </Map>
        ) : (
          <div className="w-full h-full flex flex-col justify-center items-center text-center p-4">
            <span className="text-amber-600 text-sm font-semibold">⚠️ Google Maps API Key Missing</span>
            <p className="text-xs text-gray-500 mt-1">Please insert your NEXT_PUBLIC_GOOGLE_MAPS_API_KEY into .env.local</p>
          </div>
        )}
      </div>
    </APIProvider>
  );
}