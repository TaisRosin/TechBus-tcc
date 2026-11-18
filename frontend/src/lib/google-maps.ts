export interface MapPosition {
  lat: number;
  lng: number;
}
interface MapInstance {
  fitBounds(bounds: unknown): void;
}
interface MapOverlay {
  setMap(map: MapInstance | null): void;
}
interface GoogleMapsApi {
  Map: new (element: HTMLElement, options: object) => MapInstance;
  Marker: new (options: object) => MapOverlay;
  Polyline: new (options: object) => MapOverlay;
  LatLngBounds: new () => { extend(position: MapPosition): void };
  geometry: { encoding: { decodePath(polyline: string): MapPosition[] } };
}
declare global {
  interface Window {
    google?: { maps: GoogleMapsApi };
    techbusMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}
let loading: Promise<GoogleMapsApi> | undefined;
export function loadGoogleMaps() {
  if (loading) return loading;
  loading = new Promise<GoogleMapsApi>((resolve, reject) => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) {
      reject(new Error("Chave do mapa não configurada."));
      return;
    }
    const timer = window.setTimeout(
      () =>
        reject(new Error("O mapa demorou para carregar. Recarregue a página.")),
      20000,
    );
    window.gm_authFailure = () => {
      window.dispatchEvent(new Event("maps-auth-error"));
      clearTimeout(timer);
      reject(
        new Error(
          "O Google recusou o acesso ao mapa. Confira as restrições da chave.",
        ),
      );
    };
    window.techbusMapsReady = () => {
      clearTimeout(timer);
      if (window.google) resolve(window.google.maps);
    };
    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js?" +
      new URLSearchParams({
        key,
        callback: "techbusMapsReady",
        libraries: "geometry",
        loading: "async",
        language: "pt-BR",
        region: "BR",
      });
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Não foi possível carregar o mapa. Confira a conexão."));
    };
    document.head.append(script);
  });
  return loading;
}
