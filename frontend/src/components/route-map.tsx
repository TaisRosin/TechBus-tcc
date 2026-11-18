import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, type MapPosition } from "../lib/google-maps";
import { Notice } from "./common";

export function RouteMap({
  points,
  polyline,
}: {
  points: Array<MapPosition & { label: string }>;
  polyline?: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const overlays: Array<{ setMap(map: null): void }> = [];
    const authError = () =>
      setError(
        "O Google recusou o mapa. Confira a chave e os sites autorizados.",
      );
    window.addEventListener("maps-auth-error", authError);
    void loadGoogleMaps()
      .then((maps) => {
        if (!active || !element.current) return;
        const map = new maps.Map(element.current, {
          center: { lat: -26.26, lng: -52.84 },
          zoom: 10,
          streetViewControl: false,
          mapTypeControl: false,
        });
        const bounds = new maps.LatLngBounds();
        points.forEach((point, index) => {
          bounds.extend(point);
          overlays.push(
            new maps.Marker({
              map,
              position: { lat: point.lat, lng: point.lng },
              label: String(index + 1),
              title: point.label,
            }),
          );
        });
        if (polyline) {
          const path = maps.geometry.encoding.decodePath(polyline);
          path.forEach((point) => bounds.extend(point));
          overlays.push(
            new maps.Polyline({
              map,
              path,
              strokeColor: "#087f72",
              strokeWeight: 5,
            }),
          );
        }
        if (points.length) map.fitBounds(bounds);
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      overlays.forEach((overlay) => overlay.setMap(null));
      window.removeEventListener("maps-auth-error", authError);
    };
  }, [points, polyline]);
  return (
    <>
      {error && <Notice error>{error}</Notice>}
      <div
        ref={element}
        aria-label="Mapa do percurso"
        style={{ height: 480, width: "100%", borderRadius: 12 }}
      />
    </>
  );
}
