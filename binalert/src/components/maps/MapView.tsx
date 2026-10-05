import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { ReactNode } from 'react';
import 'leaflet/dist/leaflet.css';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  pulse?: boolean;
  label?: string;
  popup: ReactNode;
}

export interface MapRoute {
  id: string;
  path: [number, number][];
  color: string;
  dashed?: boolean;
  weight?: number;
}

function makeIcon(color: string, pulse: boolean) {
  return L.divIcon({
    className: 'ba-marker',
    html: `<span class="ba-marker-dot ${pulse ? 'critical' : ''}" style="background:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

const VEHICLE_ICON = L.divIcon({
  className: 'ba-marker',
  html: `<span style="display:grid;place-items:center;width:26px;height:26px;border-radius:8px;background:#123024;border:2px solid #fff;box-shadow:0 2px 8px rgba(18,24,21,.35)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18H3V6h13v12H8"/><path d="M16 8h4l3 4v6h-2"/><circle cx="7.5" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/></svg>
  </span>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -14],
});

export function MapView({
  center,
  zoom = 13,
  markers = [],
  routes = [],
  vehicles = [],
  height = '26rem',
  className = '',
}: {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  routes?: MapRoute[];
  vehicles?: { id: string; lat: number; lng: number; popup: ReactNode }[];
  height?: string;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl2 border border-ink-100 shadow-card ${className}`} style={{ height }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="h-full w-full" attributionControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>' />
        {routes.map((r) => (
          <Polyline
            key={r.id}
            positions={r.path}
            pathOptions={{ color: r.color, weight: r.weight ?? 4, opacity: 0.85, dashArray: r.dashed ? '8 8' : undefined }}
          />
        ))}
        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={makeIcon(m.color, !!m.pulse)}>
            {m.label && (
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <span className="text-xs font-semibold">{m.label}</span>
              </Tooltip>
            )}
            <Popup maxWidth={280}>
              <div className="p-3">{m.popup}</div>
            </Popup>
          </Marker>
        ))}
        {vehicles.map((v) => (
          <Marker key={v.id} position={[v.lat, v.lng]} icon={VEHICLE_ICON}>
            <Popup maxWidth={260}>
              <div className="p-3">{v.popup}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export function MapLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-card">
      <span className="ba-label">Legend</span>
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-2 text-xs font-semibold text-ink-600">
          <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: i.color }} aria-hidden />
          {i.label}
        </span>
      ))}
    </div>
  );
}
