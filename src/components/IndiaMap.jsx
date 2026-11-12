import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const INDIA_CENTER = [22.9734, 78.6569];
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>';

export default function IndiaMap() {
  const containerRef = useRef(null);
  const [tileStatus, setTileStatus] = useState("Loading OpenStreetMap tiles…");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const map = L.map(container, {
      minZoom: 3,
      maxZoom: 19,
      zoomControl: true,
    }).setView(INDIA_CENTER, 5);
    const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: OSM_ATTRIBUTION,
    });
    let tileLoadTimeout;
    let tileErrorOccurred = false;
    const onLoading = () => {
      tileErrorOccurred = false;
      setTileStatus("Loading OpenStreetMap tiles…");
      window.clearTimeout(tileLoadTimeout);
      tileLoadTimeout = window.setTimeout(
        () => setTileStatus("Map tiles have not responded yet. Check your connection or OpenStreetMap availability."),
        12000,
      );
    };
    const onTileLoad = () => {
      window.clearTimeout(tileLoadTimeout);
      setTileStatus(tileErrorOccurred
        ? "Some map tiles could not be loaded. Check your connection or OpenStreetMap availability."
        : navigator.onLine
          ? "OpenStreetMap tiles loaded. This base map is not stored for offline use."
          : "Offline. OpenStreetMap tiles are not cached for offline use.");
    };
    const onTileError = () => {
      tileErrorOccurred = true;
      window.clearTimeout(tileLoadTimeout);
      setTileStatus(navigator.onLine
        ? "Some map tiles could not be loaded. Check your connection or OpenStreetMap availability."
        : "Map tiles are unavailable offline. No fleet positions or routes are being simulated.");
    };
    const onOnline = () => {
      setTileStatus("Connection restored. Loading OpenStreetMap tiles…");
      map.invalidateSize({ pan: false });
    };
    const onOffline = () => setTileStatus("Offline. OpenStreetMap tiles are not cached for offline use.");

    tiles.on("load", onTileLoad);
    tiles.on("tileerror", onTileError);
    tiles.on("loading", onLoading);
    tiles.addTo(map);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearTimeout(tileLoadTimeout);
      tiles.off("load", onTileLoad);
      tiles.off("tileerror", onTileError);
      tiles.off("loading", onLoading);
      map.remove();
    };
  }, []);

  return (
    <div className="admin-map-shell">
      <div
        ref={containerRef}
        className="admin-map"
        role="application"
        aria-label="Interactive map centered on India; fleet positions are not connected"
      />
      <p className="admin-map-status" role="status" aria-live="polite">
        {tileStatus}
      </p>
    </div>
  );
}
