/**
 * Live order map — RN port of web src/components/live-map.tsx.
 * Deltas:
 * - Leaflet/Google-embed → react-native-maps MapView + Marker + Polyline (same visuals:
 *   store pin, home pin, rider badge, muted full route + solid travelled route).
 * - Rider position: uses riderPos GPS fix when present, else lerps store→home by progress
 *   (identical math to web LeafletMap effect).
 * - interactive=false → gestures disabled (same as web).
 */
import { Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

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
  const rider = riderPos
    ? { latitude: riderPos.lat, longitude: riderPos.lng }
    : {
        latitude: store.lat + (home.lat - store.lat) * t,
        longitude: store.lng + (home.lng - store.lng) * t,
      };

  const storeC = { latitude: store.lat, longitude: store.lng };
  const homeC = { latitude: home.lat, longitude: home.lng };

  const midLat = (store.lat + home.lat) / 2;
  const midLng = (store.lng + home.lng) / 2;

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <MapView
        style={{ flex: 1 }}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        pitchEnabled={false}
        rotateEnabled={interactive}
        initialRegion={{
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: Math.max(Math.abs(store.lat - home.lat) * 1.9, 0.012),
          longitudeDelta: Math.max(Math.abs(store.lng - home.lng) * 1.9, 0.012),
        }}
      >
        {/* full route (muted, dashed) */}
        <Polyline coordinates={[storeC, homeC]} strokeColor="#8A8A99" strokeWidth={4} lineDashPattern={[8, 10]} />
        {/* travelled route (solid) */}
        <Polyline coordinates={[storeC, rider]} strokeColor={routeColor} strokeWidth={5} />

        <Marker coordinate={storeC} title="Store">
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
        </Marker>

        <Marker coordinate={homeC} title="Home">
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
        </Marker>

        {showRider && (
          <Marker coordinate={rider} title="Rider">
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
          </Marker>
        )}
      </MapView>
    </View>
  );
}
