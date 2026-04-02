import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function LiveMap({ loads }: any) {
  const routes = loads
    ?.filter((l: any) => l.stops?.length > 1)
    ?.map((load: any) =>
      load.stops.map((s: any) => [s.latitude, s.longitude])
    );

  return (
    <MapContainer
      center={[39.5, -98.35]} // USA center
      zoom={4}
      style={{ height: "400px", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {routes?.map((route: any, i: number) => (
        <Polyline key={i} positions={route} color="#1D4ED8" />
      ))}
    </MapContainer>
  );
}
