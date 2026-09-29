'use client';

import { useEffect, useState } from 'react';
import { APIProvider, Map, Marker, InfoWindow, useMap } from '@vis.gl/react-google-maps';

export interface MapStop {
  id: string;
  street_address: string;
  latitude: number | null;
  longitude: number | null;
  job_type: string;
  stop_number?: number;
  vehicle_name?: string;
  customer_name?: string;
}

function getStopMarkerIcon(stopNumber: number | string) {
  const numStr = String(stopNumber);
  const fontSize = numStr.length > 2 ? '10' : numStr.length === 2 ? '11.5' : '13';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
  <defs>
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <path d="M18 2C9.16 2 2 9.16 2 18c0 12.5 16 28 16 28s16-15.5 16-28c0-8.84-7.16-16-16-16z" fill="#DC2626" stroke="#991B1B" stroke-width="1.5" filter="url(#shadow)"/>
  <circle cx="18" cy="17.5" r="10.5" fill="#FFFFFF"/>
  <text x="18" y="18" text-anchor="middle" dominant-baseline="central" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${fontSize}" font-weight="900" fill="#DC2626">${numStr}</text>
</svg>`;

  const isGoogleAvailable = typeof window !== 'undefined' && !!window.google?.maps?.Size;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: isGoogleAvailable ? new window.google.maps.Size(36, 48) : undefined,
    anchor: isGoogleAvailable ? new window.google.maps.Point(18, 46) : undefined,
  };
}

function MapBoundsUpdater({ stops }: { stops: MapStop[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || stops.length === 0 || typeof window === 'undefined' || !window.google?.maps?.LatLngBounds) return;

    if (stops.length === 1 && stops[0].latitude !== null && stops[0].longitude !== null) {
      map.setCenter({ lat: Number(stops[0].latitude), lng: Number(stops[0].longitude) });
      map.setZoom(13);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    let hasCoords = false;
    stops.forEach((stop) => {
      if (stop.latitude !== null && stop.longitude !== null) {
        bounds.extend({ lat: Number(stop.latitude), lng: Number(stop.longitude) });
        hasCoords = true;
      }
    });

    if (hasCoords) {
      map.fitBounds(bounds, 50);
    }
  }, [map, stops]);

  return null;
}

export default function DispatchMap({ stops }: { stops: MapStop[] }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const defaultCenter = { lat: 29.7604, lng: -95.3698 };
  const validStops = stops.filter(stop => stop.latitude !== null && stop.longitude !== null);
  const [selectedStop, setSelectedStop] = useState<MapStop | null>(null);

  return (
    <APIProvider apiKey={apiKey}>
      <div className="w-full h-64 md:h-80 lg:h-[460px] rounded-xl overflow-hidden border border-gray-200 shadow-inner bg-gray-100">
        {apiKey ? (
          <Map
            defaultCenter={validStops[0] ? { lat: Number(validStops[0].latitude), lng: Number(validStops[0].longitude) } : defaultCenter}
            defaultZoom={12}
            gestureHandling={'cooperative'}
            disableDefaultUI={false}
          >
            <MapBoundsUpdater stops={validStops} />
            {validStops.map((stop, idx) => {
              const stopNum = stop.stop_number ?? (idx + 1);
              return (
                <Marker
                  key={stop.id}
                  position={{ lat: Number(stop.latitude), lng: Number(stop.longitude) }}
                  icon={getStopMarkerIcon(stopNum)}
                  title={`Stop ${stopNum}: ${stop.job_type} - ${stop.street_address}${stop.vehicle_name ? ` (${stop.vehicle_name})` : ''}`}
                  onClick={() => setSelectedStop(stop)}
                />
              );
            })}

            {selectedStop && selectedStop.latitude !== null && selectedStop.longitude !== null && (
              <InfoWindow
                position={{ lat: Number(selectedStop.latitude), lng: Number(selectedStop.longitude) }}
                onCloseClick={() => setSelectedStop(null)}
              >
                <div className="p-1 min-w-[190px] max-w-[260px] text-slate-800">
                  <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-gray-100">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-extrabold text-white">
                      {selectedStop.stop_number ?? (validStops.findIndex(s => s.id === selectedStop.id) + 1)}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      {selectedStop.vehicle_name ? selectedStop.vehicle_name : `Stop ${selectedStop.stop_number ?? (validStops.findIndex(s => s.id === selectedStop.id) + 1)}`}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900">{selectedStop.job_type}</p>
                  {selectedStop.customer_name && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{selectedStop.customer_name}</p>
                  )}
                  <p className="text-[11px] text-slate-600 mt-1">{selectedStop.street_address}</p>
                </div>
              </InfoWindow>
            )}
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