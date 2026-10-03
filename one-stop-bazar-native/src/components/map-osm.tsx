/**
 * OSM map helpers — Mapbox SDK (rnmapbox) rendering free OpenStreetMap raster
 * tiles. No Mapbox vector tiles used, so Mapbox tile usage stays at zero; the
 * access token is only for SDK auth (free tier).
 */
import type { ReactElement, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Text, View } from "react-native";
import { OSM_TILES } from "@/lib/commerce";

/* Native map module loads lazily: Expo Go / stale dev-client APKs don't ship
   rnmapbox native code, and a static import would fatal every screen that
   touches this file. When unavailable, OsmMap renders a neutral placeholder
   and OsmLine/OsmPin render nothing — same props API, no crash. */
const RNMapboxModule: any = (() => {
  try {
    return require("@rnmapbox/maps");
  } catch {
    return null;
  }
})();
const NativeMaps: any = RNMapboxModule?.default ?? RNMapboxModule;
const NativeCamera: any = RNMapboxModule?.Camera ?? NativeMaps?.Camera;

/** True when rnmapbox native code is linked (dev-client / release builds). */
export function isMapAvailable(): boolean {
  return !!RNMapboxModule && !!NativeMaps?.MapView;
}

export interface OsmLatLng {
  lat: number;
  lng: number;
}

export interface OsmMapProps {
  style?: StyleProp<ViewStyle>;
  /** fit camera to bounds of these points */
  fit?: OsmLatLng[];
  /** fixed camera instead of fit */
  center?: OsmLatLng;
  zoom?: number;
  interactive?: boolean;
  onMapPress?: (pt: OsmLatLng) => void;
  children?: ReactNode;
}

const OSM_STYLE = JSON.stringify({
  version: 8,
  name: "osm-raster",
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#E8EDF2" } }],
});

export function OsmMap({ style, fit, center, zoom = 14, interactive = false, onMapPress, children }: OsmMapProps) {
  // Expo Go / stale dev client: show a placeholder instead of crashing.
  if (!isMapAvailable()) {
    return (
      <View style={[style, { alignItems: "center", justifyContent: "center", backgroundColor: "#E8EDF2", padding: 16 }]}>
        <Text style={{ fontSize: 28 }}>🗺️</Text>
        <Text style={{ marginTop: 8, fontSize: 13, fontWeight: "700", color: "#334155", textAlign: "center" }}>
          Map needs a fresh dev build
        </Text>
        <Text style={{ marginTop: 2, fontSize: 11, color: "#64748B", textAlign: "center" }}>
          Run expo run:android once — live tracking works after rebuild.
        </Text>
      </View>
    );
  }
  const Mapbox: any = NativeMaps;
  const Camera: any = NativeCamera;
  let camera: ReactNode;
  if (fit && fit.length > 0) {
    const lats = fit.map((p) => p.lat);
    const lngs = fit.map((p) => p.lng);
    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);
    const padLat = Math.max((maxLat - minLat) * 0.35, 0.008);
    const padLng = Math.max((maxLng - minLng) * 0.35, 0.008);
    minLat -= padLat;
    maxLat += padLat;
    minLng -= padLng;
    maxLng += padLng;
    camera = (
      <Camera
        bounds={{ ne: [maxLng, maxLat], sw: [minLng, minLat] }}
        animationDuration={0}
        animationMode="none"
      />
    );
  } else {
    const c = center ?? { lat: 12.9169, lng: 77.6386 };
    camera = <Camera centerCoordinate={[c.lng, c.lat]} zoomLevel={zoom} animationDuration={0} />;
  }
  return (
    <Mapbox.MapView
      style={style}
      styleJSON={OSM_STYLE}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      pitchEnabled={false}
      rotateEnabled={false}
      logoEnabled
      attributionEnabled
      onPress={
        onMapPress
          ? (feature: any) => {
              const c = feature.geometry?.coordinates;
              if (Array.isArray(c) && c.length >= 2) onMapPress({ lng: c[0], lat: c[1] });
            }
          : undefined
      }
    >
      {camera}
      <Mapbox.RasterSource
        id="osm"
        tileUrlTemplates={[OSM_TILES]}
        tileSize={256}
        maxZoomLevel={19}
        attribution="© OpenStreetMap contributors"
      >
        <Mapbox.RasterLayer id="osm-layer" style={{ rasterOpacity: 1 }} />
      </Mapbox.RasterSource>
      {children}
    </Mapbox.MapView>
  );
}

export function OsmLine({
  id,
  coords,
  color,
  width = 4,
  dash,
}: {
  id: string;
  coords: OsmLatLng[];
  color: string;
  width?: number;
  /** Mapbox dasharray units are line-widths, not px. e.g. [6,6]px @4px width → [1.5,1.5] */
  dash?: number[];
}) {
  if (!isMapAvailable() || coords.length < 2) return null;
  const Mapbox: any = NativeMaps;
  return (
    <Mapbox.ShapeSource
      id={id}
      shape={{ type: "LineString", coordinates: coords.map((c) => [c.lng, c.lat]) }}
    >
      <Mapbox.LineLayer
        id={`${id}-line`}
        style={{
          lineColor: color,
          lineWidth: width,
          ...(dash ? { lineDasharray: dash } : {}),
        }}
      />
    </Mapbox.ShapeSource>
  );
}

export function OsmPin({ point, children }: { point: OsmLatLng; children: ReactElement }) {
  if (!isMapAvailable()) return null;
  const Mapbox: any = NativeMaps;
  return (
    <Mapbox.MarkerView coordinate={[point.lng, point.lat]} allowOverlap>
      {children}
    </Mapbox.MarkerView>
  );
}
