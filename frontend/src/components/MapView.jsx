import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from "react-leaflet";
import { LocateFixed, MapPin } from "lucide-react";

function MapController({ place, userPosition, route }) {
  const map = useMap();

  useEffect(() => {
    if (route?.coordinates?.length) {
      map.fitBounds(route.coordinates, { padding: [48, 48], maxZoom: 16 });
      return;
    }
    if (place) map.flyTo(place.position, 17, { duration: 1 });
  }, [map, place, route]);

  useEffect(() => {
    if (userPosition) map.flyTo(userPosition, 17, { duration: 1 });
  }, [map, userPosition]);

  return null;
}

export default function MapView({
  places, selected, onSelect, position, route, mapCenter,
  text, language, routeLoading, routeError, onLocate,
}) {
  return (
    <div className="map-panel">
      <MapContainer center={mapCenter} zoom={16} scrollWheelZoom className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {places.map((place) => (
          <CircleMarker
            key={place.id}
            center={place.position}
            radius={selected?.id === place.id ? 11 : 7}
            pathOptions={{
              color: selected?.id === place.id ? "#ffffff" : "#216b50",
              fillColor: selected?.id === place.id ? "#c49a55" : "#216b50",
              fillOpacity: 1,
              weight: 3,
            }}
            eventHandlers={{ click: () => onSelect(place) }}
          >
            <Popup>
              <strong>{place.name}</strong><br />{place.category}<br />
              <button onClick={() => onSelect(place)}>{text.start}</button>
            </Popup>
          </CircleMarker>
        ))}
        {position && (
          <CircleMarker center={position} radius={9} pathOptions={{
            color: "#ffffff", fillColor: "#2674e8", fillOpacity: 1, weight: 3,
          }}>
            <Popup>{text.currentPosition}</Popup>
          </CircleMarker>
        )}
        {route?.coordinates && <Polyline positions={route.coordinates} pathOptions={{ color: "#2674e8", weight: 6, opacity: 0.85 }} />}
        <MapController place={selected} userPosition={position} route={route} />
      </MapContainer>

      <div className="map-label"><MapPin size={16} /><span>{text.mapLabel}</span></div>
      {(routeLoading || route || routeError) && (
        <div className="map-route-status" role="status">
          {routeLoading
            ? language === "vi" ? "Đang tìm đường đi…" : "Finding route…"
            : route
              ? `${language === "vi" ? "Tuyến đường" : "Route"}: ${(route.distance / 1000).toFixed(1)} km · ${Math.max(1, Math.round(route.duration / 60))} min`
              : routeError}
        </div>
      )}
      <button className="map-locate" onClick={onLocate} aria-label={text.myLocation}>
        <LocateFixed size={19} />
      </button>
    </div>
  );
}
