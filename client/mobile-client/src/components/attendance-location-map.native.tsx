import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { assessGeofence } from '../utils/geofence-assessment';

interface AttendanceLocationMapProps {
  sessionTitle: string;
  sessionLatitude: number;
  sessionLongitude: number;
  radius: number;
  studentLatitude: number | null;
  studentLongitude: number | null;
  accuracy: number | null;
  distanceMeters: number | null;
}

interface MapPayload {
  target: { latitude: number; longitude: number };
  student: { latitude: number; longitude: number } | null;
  radius: number;
  accuracy: number | null;
  inRange: boolean | null;
}

const MAP_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; margin: 0; background: #eef3f0; }
    .leaflet-container { background: #eef3f0; font-family: sans-serif; }
    .pin { width: 18px; height: 18px; border: 3px solid white; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 2px 8px #0f172a88; }
    .pin-user { background: #2563eb; }
    .pin-inside { background: #059669; }
    .pin-outside { background: #dc2626; }
    .pin-class { background: #059669; }
    .leaflet-control-attribution { font-size: 9px !important; }
    .leaflet-control-attribution a { color: #2563eb !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    let map, studentMarker, targetMarker, distanceLine, accuracyCircle, geofenceCircle;
    function updateAttendanceMap(data) {
      const target = [data.target.latitude, data.target.longitude];
      const points = [target];
      if (data.student) points.push([data.student.latitude, data.student.longitude]);
      if (!map) {
        map = L.map('map', { zoomControl: true, attributionControl: true });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        }).addTo(map);
      }
      if (!geofenceCircle) {
        geofenceCircle = L.circle(target, { radius: data.radius, color: '#16a34a', weight: 3, fillColor: '#22c55e', fillOpacity: 0.18 }).addTo(map).bindTooltip('Bán kính cho phép');
        targetMarker = L.marker(target, { icon: L.divIcon({ className: '', html: '<div class="pin pin-class"></div>', iconSize: [18, 18], iconAnchor: [9, 18] }) }).addTo(map).bindPopup('Địa điểm phiên học');
      } else {
        geofenceCircle.setLatLng(target).setRadius(data.radius).setTooltipContent('Bán kính cho phép ' + data.radius + ' m');
        targetMarker.setLatLng(target);
      }
      if (data.student) {
        const student = [data.student.latitude, data.student.longitude];
        if (!studentMarker) {
          studentMarker = L.marker(student).addTo(map).bindPopup('Vị trí hiện tại của bạn');
        } else {
          studentMarker.setLatLng(student);
        }
        const pinClass = data.inRange === null ? 'pin-user' : data.inRange ? 'pin-inside' : 'pin-outside';
        studentMarker.setIcon(L.divIcon({ className: '', html: '<div class="pin ' + pinClass + '"></div>', iconSize: [18, 18], iconAnchor: [9, 18] }));
        if (!distanceLine) distanceLine = L.polyline([student, target], { color: '#2563eb', weight: 3, dashArray: '7 7' }).addTo(map);
        else distanceLine.setLatLngs([student, target]);
        if (data.accuracy !== null && data.accuracy > 0) {
          if (!accuracyCircle) accuracyCircle = L.circle(student, { radius: data.accuracy, color: '#2563eb', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.12 }).addTo(map);
          else accuracyCircle.setLatLng(student).setRadius(data.accuracy);
        } else if (accuracyCircle) {
          accuracyCircle.remove();
          accuracyCircle = null;
        }
      } else if (studentMarker) {
        studentMarker.remove();
        studentMarker = null;
        if (distanceLine) { distanceLine.remove(); distanceLine = null; }
        if (accuracyCircle) { accuracyCircle.remove(); accuracyCircle = null; }
      }
      map.fitBounds(L.latLngBounds(points).pad(0.35), { maxZoom: 18, animate: true });
      setTimeout(() => map.invalidateSize(), 100);
    }
    window.updateAttendanceMap = updateAttendanceMap;
  </script>
</body>
</html>`;

export function AttendanceLocationMap({
  sessionTitle,
  sessionLatitude,
  sessionLongitude,
  radius,
  studentLatitude,
  studentLongitude,
  accuracy,
  distanceMeters,
}: AttendanceLocationMapProps) {
  const webViewRef = useRef<WebView | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [hasMapError, setHasMapError] = useState(false);
  const assessment = assessGeofence(distanceMeters, radius, accuracy);

  const payload = useMemo<MapPayload>(
    () => ({
      target: { latitude: sessionLatitude, longitude: sessionLongitude },
      student:
        studentLatitude === null || studentLongitude === null
          ? null
          : { latitude: studentLatitude, longitude: studentLongitude },
      radius,
      accuracy,
      inRange:
        assessment.status === 'unknown'
          ? null
          : assessment.status === 'inside',
    }),
    [sessionLatitude, sessionLongitude, studentLatitude, studentLongitude, radius, accuracy, assessment.status],
  );

  useEffect(() => {
    if (!isMapLoaded) return;
    const serialized = JSON.stringify(payload);
    webViewRef.current?.injectJavaScript(
      `window.updateAttendanceMap(${serialized}); true;`,
    );
  }, [isMapLoaded, payload]);

  const openDirections = () => {
    const origin = payload.student
      ? `${payload.student.latitude},${payload.student.longitude}`
      : undefined;
    const destination = `${sessionLatitude},${sessionLongitude}`;
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`
      : `https://www.google.com/maps/search/?api=1&query=${destination}`;
    void Linking.openURL(url);
  };

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>BẢN ĐỒ ĐIỂM DANH · OPENSTREETMAP</Text>
          <Text style={styles.title} numberOfLines={1}>{sessionTitle}</Text>
          <Text
            style={[
              styles.zoneStatus,
              assessment.status === 'inside' && styles.insideStatus,
              assessment.status === 'outside' && styles.outsideStatus,
              assessment.status === 'unknown' && styles.unknownStatus,
            ]}
          >
            {assessment.status === 'inside'
              ? '● BẠN ĐANG TRONG BÁN KÍNH'
              : assessment.status === 'outside'
                ? '● BẠN ĐANG NGOÀI BÁN KÍNH'
                : '● ĐANG CHỜ VỊ TRÍ GPS'}
          </Text>
        </View>
        <View style={styles.distancePill}>
          <Text style={styles.distanceValue}>{distanceMeters === null ? '—' : `${distanceMeters} m`}</Text>
          <Text style={styles.distanceCaption}>đến lớp</Text>
        </View>
      </View>

      {hasMapError ? (
        <Pressable onPress={openDirections} style={styles.errorPanel}>
          <Text style={styles.errorTitle}>Không tải được bản đồ</Text>
          <Text style={styles.errorMessage}>Kiểm tra kết nối mạng rồi thử lại, hoặc mở chỉ đường bên ngoài.</Text>
          <Text style={styles.directions}>Mở Google Maps →</Text>
        </Pressable>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ html: MAP_HTML }}
          style={styles.map}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="compatibility"
          onLoadEnd={() => setIsMapLoaded(true)}
          onError={() => setHasMapError(true)}
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode >= 400) setHasMapError(true);
          }}
          accessibilityLabel="Bản đồ vị trí GPS và địa điểm điểm danh"
        />
      )}

      {assessment.nearBoundary && (
        <Text style={styles.boundaryWarning}>
          Vị trí gần ranh giới; sai số GPS ±{Math.round(accuracy ?? 0)} m có thể ảnh hưởng kết quả.
        </Text>
      )}

      <View style={styles.legend}>
        <LegendItem color="#2563EB" label="Vị trí của bạn" />
        <LegendItem color="#16A34A" label={`Vùng cho phép · bán kính ${radius} m`} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.accuracyText}>
          {accuracy === null ? 'Đang chờ GPS…' : `Sai số GPS hiện tại ±${Math.round(accuracy)} m`}
        </Text>
        <Pressable onPress={openDirections} accessibilityRole="link">
          <Text style={styles.directions}>Chỉ đường</Text>
        </Pressable>
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5ECE7',
    backgroundColor: '#FFFFFF',
  },
  heading: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headingCopy: { flex: 1, gap: 4 },
  eyebrow: { color: '#738078', fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  title: { color: '#26352D', fontSize: 15, fontWeight: '700' },
  zoneStatus: { marginTop: 5, fontSize: 10, fontWeight: '800' },
  insideStatus: { color: '#16834B' },
  outsideStatus: { color: '#C2413A' },
  unknownStatus: { color: '#A56A00' },
  boundaryWarning: {
    paddingHorizontal: 16,
    paddingTop: 10,
    color: '#946200',
    fontSize: 11,
    lineHeight: 16,
  },
  distancePill: {
    alignItems: 'flex-end',
    borderRadius: 12,
    backgroundColor: '#EAF7F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  distanceValue: { color: '#16834B', fontSize: 17, fontWeight: '800' },
  distanceCaption: { color: '#738078', fontSize: 10 },
  map: { height: 260, width: '100%', backgroundColor: '#EEF3F0' },
  errorPanel: {
    height: 180,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F1F5F2',
    gap: 8,
  },
  errorTitle: { color: '#26352D', fontSize: 16, fontWeight: '700' },
  errorMessage: { color: '#738078', fontSize: 13, lineHeight: 19 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { color: '#536158', fontSize: 11 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  accuracyText: { color: '#738078', fontSize: 11, flex: 1 },
  directions: { color: '#16834B', fontSize: 12, fontWeight: '700' },
});
