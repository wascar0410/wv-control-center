/**
 * FleetMap.tsx
 * Design: Dark operational map dashboard — full-screen Google Maps with overlay panels.
 * Fleet type color coding: blue=internal, purple=leased, orange=external.
 * Real-time driver markers with load info popups.
 * NOTE: Uses VITE_GOOGLE_MAPS_API_KEY directly (not Manus proxy) for Railway deployment.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  Navigation,
  RefreshCw,
  Users,
  Package,
  Clock,
  Wifi,
  WifiOff,
  MapPin,
} from "lucide-react";

const FLEET_COLORS: Record<string, { bg: string; text: string; marker: string }> = {
  internal: { bg: "bg-blue-500/20", text: "text-blue-300", marker: "#3b82f6" },
  leased: { bg: "bg-purple-500/20", text: "text-purple-300", marker: "#a855f7" },
  external: { bg: "bg-orange-500/20", text: "text-orange-300", marker: "#f97316" },
};

const FLEET_LABELS: Record<string, string> = {
  internal: "Interno",
  leased: "Arrendado",
  external: "Externo",
};

function getTimeSince(ts: string | Date): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora mismo";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `Hace ${hrs}h`;
}

// Load Google Maps directly using VITE_GOOGLE_MAPS_API_KEY
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.maps) { resolve(); return; }
    const existing = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    if (!GOOGLE_MAPS_KEY) {
      reject(new Error("VITE_GOOGLE_MAPS_API_KEY not configured in Railway environment variables"));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&v=weekly&libraries=marker,places,geometry`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });
}

export default function FleetMap() {
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<number, any>>(new Map());
  const infoWindowRef = useRef<any>(null);

  const { data: locations, refetch, isLoading } = trpc.admin.getFleetLocations.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const [lastRefresh, setLastRefresh] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Initialize map
  useEffect(() => {
    let cancelled = false;
    loadGoogleMapsScript()
      .then(() => {
        if (cancelled || !mapContainerRef.current) return;
        const google = (window as any).google;
        const map = new google.maps.Map(mapContainerRef.current, {
          zoom: 7,
          center: { lat: 40.7128, lng: -74.0060 }, // New York/NJ area
          mapTypeControl: true,
          fullscreenControl: true,
          zoomControl: true,
          streetViewControl: false,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
          ],
        });
        infoWindowRef.current = new google.maps.InfoWindow();
        setMapInstance(map);
        setMapReady(true);
      })
      .catch((err) => {
        if (!cancelled) setMapError(err.message);
      });
    return () => { cancelled = true; };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!mapInstance || !locations) return;
    const google = (window as any).google;
    const currentIds = new Set(locations.map((l: any) => l.driverId));

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });

    locations.forEach((loc: any) => {
      const color = FLEET_COLORS[loc.fleetType]?.marker ?? "#3b82f6";
      const existing = markersRef.current.get(loc.driverId);
      const position = { lat: loc.latitude, lng: loc.longitude };

      if (existing) {
        existing.setPosition(position);
      } else {
        const marker = new google.maps.Marker({
          position,
          map: mapInstance,
          title: loc.driverName ?? "Conductor",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          label: {
            text: (loc.driverName ?? "?").charAt(0).toUpperCase(),
            color: "#ffffff",
            fontSize: "11px",
            fontWeight: "bold",
          },
        });

        marker.addListener("click", () => {
          setSelectedDriver(loc.driverId);
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(`
              <div style="font-family: sans-serif; padding: 8px; min-width: 200px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${loc.driverName ?? "Conductor"}</div>
                ${loc.activeLoad ? `
                  <div style="font-size: 12px; color: #666; margin-bottom: 2px;">📦 ${loc.activeLoad.clientName}</div>
                  <div style="font-size: 11px; color: #999;">→ ${loc.activeLoad.destination}</div>
                ` : '<div style="font-size: 12px; color: #999;">Sin carga activa</div>'}
                ${loc.speed ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">🚗 ${Math.round(loc.speed)} mph</div>` : ""}
              </div>
            `);
            infoWindowRef.current.open(mapInstance, marker);
          }
        });

        markersRef.current.set(loc.driverId, marker);
      }
    });

    if (locations.length > 0 && markersRef.current.size > 0) {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach((loc: any) => bounds.extend({ lat: loc.latitude, lng: loc.longitude }));
      if (locations.length === 1) {
        mapInstance.setCenter({ lat: locations[0].latitude, lng: locations[0].longitude });
        mapInstance.setZoom(12);
      } else {
        mapInstance.fitBounds(bounds, 80);
      }
    }
  }, [mapInstance, locations]);

  const activeCount = locations?.length ?? 0;
  const withLoadCount = locations?.filter((l: any) => l.activeLoad).length ?? 0;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Navigation className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">GPS Multi-Track</h1>
            <p className="text-xs text-slate-500">Monitoreo en tiempo real de la flota</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300">{activeCount} activos</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Package className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">{withLoadCount} en ruta</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-slate-500 text-xs">
                Actualizado {getTimeSince(lastRefresh)}
              </span>
            </div>
          </div>

          <button
            onClick={() => { refetch(); setLastRefresh(new Date()); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Driver List Panel */}
        <div className="w-72 bg-slate-900 border-r border-slate-800 overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Conductores Activos</span>
            </div>
          </div>

          {activeCount === 0 ? (
            <div className="p-8 text-center">
              <WifiOff className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-500 text-sm">Sin conductores activos</p>
              <p className="text-slate-600 text-xs mt-1">
                Los conductores aparecen aquí cuando comparten su ubicación
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {locations?.map((loc: any) => {
                const colors = FLEET_COLORS[loc.fleetType] ?? FLEET_COLORS.internal;
                const isSelected = selectedDriver === loc.driverId;
                return (
                  <div
                    key={loc.driverId}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected ? "bg-slate-800" : "hover:bg-slate-800/50"
                    }`}
                    onClick={() => {
                      setSelectedDriver(loc.driverId);
                      if (mapInstance) {
                        mapInstance.panTo({ lat: loc.latitude, lng: loc.longitude });
                        mapInstance.setZoom(13);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                        <span className={`text-sm font-bold ${colors.text}`}>
                          {(loc.driverName ?? "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white truncate">
                            {loc.driverName ?? "Conductor"}
                          </span>
                          <div className="flex items-center gap-1 ml-2">
                            <Wifi className="w-3 h-3 text-emerald-400" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className={`text-xs px-1.5 py-0 border-0 ${colors.bg} ${colors.text}`}>
                            {FLEET_LABELS[loc.fleetType] ?? loc.fleetType}
                          </Badge>
                          {loc.speed && (
                            <span className="text-xs text-slate-500">{Math.round(loc.speed)} mph</span>
                          )}
                        </div>
                        {loc.activeLoad && (
                          <div className="mt-1.5 p-2 bg-slate-800 rounded-md">
                            <div className="text-xs text-slate-400 truncate">
                              📦 {loc.activeLoad.clientName}
                            </div>
                            <div className="text-xs text-slate-500 truncate mt-0.5">
                              → {loc.activeLoad.destination}
                            </div>
                          </div>
                        )}
                        <div className="text-xs text-slate-600 mt-1">
                          {getTimeSince(loc.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="p-4 border-t border-slate-800 mt-auto">
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Leyenda</p>
            <div className="space-y-1.5">
              {Object.entries(FLEET_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: FLEET_COLORS[key]?.marker }}
                  />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="w-full h-full" />

          {!mapReady && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Cargando mapa...</p>
              </div>
            </div>
          )}

          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="text-center max-w-sm px-6">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                <h3 className="text-white font-semibold mb-2">Mapa no disponible</h3>
                <p className="text-slate-400 text-sm mb-4">{mapError}</p>
                <div className="bg-slate-800 rounded-lg p-4 text-left">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Para activar el mapa GPS:</p>
                  <p className="text-xs text-slate-400">
                    Agrega <code className="bg-slate-700 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> en las variables de entorno de Railway con tu clave de Google Maps API.
                  </p>
                </div>
              </div>
            </div>
          )}

          {mapReady && activeCount === 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl px-6 py-3 text-center">
              <p className="text-slate-300 text-sm font-medium">Sin conductores activos en este momento</p>
              <p className="text-slate-500 text-xs mt-0.5">
                Los conductores deben activar el GPS en la app del conductor
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
