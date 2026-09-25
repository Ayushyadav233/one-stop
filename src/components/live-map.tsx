"use client";
import { useEffect, useRef } from "react";

export interface LatLng { lat: number; lng: number }

export interface LiveMapProps {
  store: LatLng;
  home: LatLng;
  /** 0 → at store, 1 → at home */
  progress: number;
  riderPos?: LatLng;
  showRider: boolean;
  routeColor?: string;
  interactive?: boolean;
}

/**
 * Real street map.
 * - Uses Google Maps Embed when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is configured.
 * - Otherwise renders a real OpenStreetMap map via Leaflet (no API key required).
 */
export function LiveMap({ store, home, progress, riderPos, showRider, routeColor = "#0C831F", interactive = false }: LiveMapProps) {
  const gkey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (gkey) {
    const src = `https://www.google.com/maps/embed/v1/directions?key=${gkey}&origin=${store.lat},${store.lng}&destination=${home.lat},${home.lng}&mode=driving&zoom=14`;
    return (
      <div className="absolute inset-0">
        <iframe title="Live order map" src={src} className="h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      </div>
    );
  }
  return <LeafletMap store={store} home={home} progress={progress} riderPos={riderPos} showRider={showRider} routeColor={routeColor} interactive={interactive} />;
}

function LeafletMap({ store, home, progress, riderPos, showRider, routeColor, interactive }: LiveMapProps) {
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const riderRef = useRef<import("leaflet").Marker | null>(null);
  const doneRef = useRef<import("leaflet").Polyline | null>(null);

  // build map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !holder.current || mapRef.current) return;

      const map = L.map(holder.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: !!interactive,
        scrollWheelZoom: !!interactive,
        doubleClickZoom: !!interactive,
        touchZoom: !!interactive,
        keyboard: false,
        boxZoom: false,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        crossOrigin: true,
      }).addTo(map);

      const pin = (emoji: string, ring: string) =>
        L.divIcon({
          className: "",
          html: `<div style="display:grid;place-items:center;width:38px;height:38px;border-radius:14px;background:#fff;box-shadow:0 8px 20px rgba(0,0,0,.25);border:2px solid ${ring};font-size:18px;line-height:1">${emoji}</div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

      L.marker([store.lat, store.lng], { icon: pin("🏪", "#0C831F") }).addTo(map);
      L.marker([home.lat, home.lng], { icon: pin("🏠", "#E23744") }).addTo(map);

      // full route (muted) + travelled route (solid)
      L.polyline([[store.lat, store.lng], [home.lat, home.lng]], {
        color: "#8A8A99",
        weight: 4,
        opacity: 0.35,
        dashArray: "8 10",
        lineCap: "round",
      }).addTo(map);

      doneRef.current = L.polyline([[store.lat, store.lng], [store.lat, store.lng]], {
        color: routeColor,
        weight: 5,
        opacity: 0.95,
        lineCap: "round",
      }).addTo(map);

      const initialLat = riderPos ? riderPos.lat : store.lat;
      const initialLng = riderPos ? riderPos.lng : store.lng;

      riderRef.current = L.marker([initialLat, initialLng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="display:grid;place-items:center;width:36px;height:36px;border-radius:999px;background:#F8CB46;box-shadow:0 8px 20px rgba(0,0,0,.35);border:2px solid #fff;font-size:18px;line-height:1;position:relative"><span style="position:absolute;inset:-3px;border-radius:999px;border:2px solid #0C831F;opacity:.8;animation:pulse 2s infinite"></span>🛵</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
        zIndexOffset: 500,
      });
      if (showRider) riderRef.current.addTo(map);

      map.fitBounds(
        L.latLngBounds([
          [store.lat, store.lng],
          [home.lat, home.lng],
        ]),
        { padding: [52, 52] }
      );

      setTimeout(() => map.invalidateSize(), 120);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      riderRef.current = null;
      doneRef.current = null;
    };
  }, [store.lat, store.lng, home.lat, home.lng, routeColor, showRider, interactive]);

  // move rider + travelled polyline as status changes
  useEffect(() => {
    let lat: number;
    let lng: number;
    if (riderPos) {
      lat = riderPos.lat;
      lng = riderPos.lng;
    } else {
      const t = Math.max(0, Math.min(1, progress));
      lat = store.lat + (home.lat - store.lat) * t;
      lng = store.lng + (home.lng - store.lng) * t;
    }

    riderRef.current?.setLatLng([lat, lng]);
    doneRef.current?.setLatLngs([
      [store.lat, store.lng],
      [lat, lng],
    ]);
    const map = mapRef.current;
    const rider = riderRef.current;
    if (map && rider) {
      if (showRider && !map.hasLayer(rider)) rider.addTo(map);
      if (!showRider && map.hasLayer(rider)) map.removeLayer(rider);
    }
  }, [progress, riderPos?.lat, riderPos?.lng, showRider, store.lat, store.lng, home.lat, home.lng]);

  return <div ref={holder} className="absolute inset-0 h-full w-full" />;
}
