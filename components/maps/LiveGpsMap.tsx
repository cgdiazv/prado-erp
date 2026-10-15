"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, Navigation2, Pause, Play, Radio, RotateCcw, ShieldAlert } from "lucide-react";

export type LiveVehiclePin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "moving" | "idle" | "alert" | "offline";
  driver?: string;
  speed?: number;
  destination?: string;
};

type LiveGpsMapProps = {
  vehicles: LiveVehiclePin[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  geofences?: GeofenceZone[];
  routePlayback?: RoutePlayback;
};

export type GeofenceZone = {
  id: string;
  name: string;
  coordinates: [number, number][];
  fillColor?: string;
  lineColor?: string;
};

export type RoutePlayback = {
  vehicleId: string;
  points: [number, number][];
  label?: string;
};

const DEFAULT_CENTER: [number, number] = [-95.3698, 29.7604];

export default function LiveGpsMap({
  vehicles,
  center = DEFAULT_CENTER,
  zoom = 9,
  className,
  geofences = [],
  routePlayback,
}: LiveGpsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const playbackMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);

  const hasToken = Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);

  useEffect(() => {
    if (!hasToken || !mapContainerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center,
      zoom,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");

    map.on("load", () => {
      mapRef.current = map;
      setMapReady(true);

      const geofenceFeatures = geofences.map((geofence) => ({
        type: "Feature" as const,
        properties: {
          id: geofence.id,
          name: geofence.name,
          fillColor: geofence.fillColor ?? "rgba(96,165,250,0.18)",
          lineColor: geofence.lineColor ?? "#60a5fa",
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [geofence.coordinates],
        },
      }));

      map.addSource("fleet-geofences", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: geofenceFeatures,
        },
      });

      map.addLayer({
        id: "fleet-geofences-fill",
        type: "fill",
        source: "fleet-geofences",
        paint: {
          "fill-color": ["get", "fillColor"],
          "fill-opacity": 1,
        },
      });

      map.addLayer({
        id: "fleet-geofences-outline",
        type: "line",
        source: "fleet-geofences",
        paint: {
          "line-color": ["get", "lineColor"],
          "line-width": 2,
        },
      });

      if (routePlayback && routePlayback.points && routePlayback.points.length > 1) {
        map.addSource("fleet-route-playback", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: routePlayback.points.slice(0, 1),
            },
          },
        });

        map.addLayer({
          id: "fleet-route-playback-line",
          type: "line",
          source: "fleet-route-playback",
          paint: {
            "line-color": "#10b981",
            "line-width": 4,
            "line-opacity": 0.95,
          },
        });

        playbackMarkerRef.current = new mapboxgl.Marker({ color: "#10b981" })
          .setLngLat(routePlayback.points[0])
          .setPopup(new mapboxgl.Popup({ offset: 16 }).setText(routePlayback.label ?? "Route playback"))
          .addTo(map);
      }
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      playbackMarkerRef.current?.remove();
      playbackMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [center, hasToken, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();

    vehicles.forEach((vehicle) => {
      const markerElement = document.createElement("div");
      const isOffline = vehicle.status === "offline";
      const bgColor =
        vehicle.status === "alert"
          ? "#ef4444"
          : isOffline
          ? "#64748b"
          : "#10b981";

      markerElement.style.width = "32px";
      markerElement.style.height = "32px";
      markerElement.style.borderRadius = "50%";
      markerElement.style.backgroundColor = bgColor;
      markerElement.style.border = "3px solid #0f172a";
      markerElement.style.boxShadow = "0 4px 12px rgba(0,0,0,0.35)";
      markerElement.style.display = "flex";
      markerElement.style.alignItems = "center";
      markerElement.style.justifyContent = "center";
      markerElement.style.cursor = "pointer";
      markerElement.style.opacity = isOffline ? "0.75" : "1";
      markerElement.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
        </div>
      `;

      const popupHtml = `
        <div style="padding:4px 6px;color:#0f172a;font-family:sans-serif;font-size:12px;line-height:1.4;">
          <div style="font-weight:700;font-size:13px;color:#0f172a;">${vehicle.name}</div>
          <div style="color:#475569;margin-top:2px;">Driver: <strong style="color:#0f172a;">${vehicle.driver || "Unassigned"}</strong></div>
          <div style="color:#475569;">Status: <strong style="color:${isOffline ? "#64748b" : "#10b981"};">${isOffline ? "OFFLINE / OFF DUTY" : vehicle.status.toUpperCase()}</strong></div>
          <div style="color:#475569;">Speed: <strong style="color:#0f172a;">${vehicle.speed ?? 0} mph</strong></div>
          ${vehicle.destination ? `<div style="color:${isOffline ? "#64748b" : "#0284c7"};font-weight:600;margin-top:2px;">📍 ${vehicle.destination}</div>` : ""}
        </div>
      `;

      const marker = new mapboxgl.Marker({ element: markerElement })
        .setLngLat([vehicle.lng, vehicle.lat])
        .setPopup(new mapboxgl.Popup({ offset: 18 }).setHTML(popupHtml))
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([vehicle.lng, vehicle.lat]);
    });

    if (!bounds.isEmpty() && markersRef.current.length > 0) {
      map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 800 });
    }

  }, [vehicles, mapReady]);

  useEffect(() => {
    if (!isPlaying || !routePlayback || routePlayback.points.length < 2) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setPlaybackIndex((currentIndex) => (currentIndex >= routePlayback.points.length - 1 ? 0 : currentIndex + 1));
    }, 1200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPlaying, routePlayback]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routePlayback || !routePlayback.points) {
      return;
    }
    const playbackPoint = routePlayback.points[playbackIndex];

    if (!playbackPoint) {
      return;
    }

    playbackMarkerRef.current?.setLngLat(playbackPoint);

    const source = map.getSource("fleet-route-playback") as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: routePlayback.points.slice(0, playbackIndex + 1),
        },
      });
    }
  }, [playbackIndex, routePlayback]);

  const playbackStatus = routePlayback && routePlayback.points.length > 0 ? `${playbackIndex + 1}/${routePlayback.points.length}` : null;

  function resetPlayback() {
    setIsPlaying(false);
    setPlaybackIndex(0);
  }

  if (!hasToken) {
    return (
      <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 ${className ?? ""}`}>
        <div className="flex min-h-[480px] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_35%),linear-gradient(135deg,_rgba(255,255,255,1),_rgba(250,250,247,1))] p-6 text-center">
          <div className="max-w-md space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600">
              <MapPin size={24} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Mapbox token required</h3>
            <p className="text-sm text-slate-600">
              Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to render the live GPS map. The component is already wired for markers, route paths, and geofence-ready overlays.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Radio size={14} className="text-emerald-500" /> Live tracking shell loaded
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 ${className ?? ""}`}>
      <div className="absolute left-4 top-4 z-10 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-600 backdrop-blur">
        <span className="mr-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {vehicles.length} vehicles tracked
      </div>
      {routePlayback && routePlayback.points.length > 1 && (
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-2 py-1 backdrop-blur shadow-sm shadow-slate-200/40">
          <button
            type="button"
            onClick={() => setIsPlaying((playing) => !playing)}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-emerald-50"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />} {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={resetPlayback}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-emerald-50"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      )}
      <div ref={mapContainerRef} className="h-[480px] w-full" />
      {!mapReady && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-slate-600">
          Initializing live GPS map...
        </div>
      )}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-600 backdrop-blur">
        <Radio size={12} className="text-emerald-500 animate-pulse" /> Live Telematics Stream
        {geofences && geofences.length > 0 && (
          <span className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <ShieldAlert size={12} className="text-emerald-500" /> {geofences.length} Geofence{geofences.length > 1 ? "s" : ""}
          </span>
        )}
        {playbackStatus && (
          <span className="border-l border-slate-200 pl-2 text-slate-500">{playbackStatus}</span>
        )}
      </div>
    </div>
  );
}