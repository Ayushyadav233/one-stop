/**
 * Live order map — RN port of web src/components/live-map.tsx.
 * Deltas:
 * - Leaflet/Google-embed → Mapbox SDK (rnmapbox) rendering OSM raster tiles
 *   (same visuals: store pin, home pin, rider badge, muted full route +
 *   solid travelled route).
 * - Rider position: uses riderPos GPS fix when present, else lerps store→home by progress
 *   (identical math to web LeafletMap effect).
 * - interactive=false → gestures disabled (same as web).
 */
import { Text, View } from "react-native";
import { OsmLatLng, OsmLine, OsmMap, OsmPin } from "./map-osm";

export interface LatLng {
  lat: number;
  lng: number;
}

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

export function LiveMap({
  store,
  home,
  progress,
  riderPos,
  showRider,
  routeColor = "#0C831F",
  interactive = false,
}: LiveMapProps) {
  // rider position: GPS fix wins, otherwise lerp store → home (web parity)
  const t = Math.max(0, Math.min(1, progress));
  const rider: OsmLatLng = riderPos
    ? { lat: riderPos.lat, lng: riderPos.lng }
    : {
        lat: store.lat + (home.lat - store.lat) * t,
        lng: store.lng + (home.lng - store.lng) * t,
      };

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <OsmMap style={{ flex: 1 }} fit={[store, home]} interactive={interactive}>
        {/* full route (muted, dashed) */}
        <OsmLine id="live-full" coords={[store, home]} color="#8A8A99" width={4} dash={[2, 2.5]} />
        {/* travelled route (solid) */}
        <OsmLine id="live-travelled" coords={[store, rider]} color={routeColor} width={5} />

        <OsmPin point={store}>
          <View
            style={{
              height: 38,
              width: 38,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: "#fff",
              borderWidth: 2,
              borderColor: "#0C831F",
            }}
          >
            <Text style={{ fontSize: 18, lineHeight: 20 }}>🏪</Text>
          </View>
        </OsmPin>

        <OsmPin point={home}>
          <View
            style={{
              height: 38,
              width: 38,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: "#fff",
              borderWidth: 2,
              borderColor: "#E23744",
            }}
          >
            <Text style={{ fontSize: 18, lineHeight: 20 }}>🏠</Text>
          </View>
        </OsmPin>

        {showRider && (
          <OsmPin point={rider}>
            <View
              style={{
                height: 36,
                width: 36,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 18,
                backgroundColor: "#F8CB46",
                borderWidth: 2,
                borderColor: "#fff",
              }}
            >
              <Text style={{ fontSize: 18, lineHeight: 20 }}>🛵</Text>
            </View>
          </OsmPin>
        )}
      </OsmMap>
    </View>
  );
}
