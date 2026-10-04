import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const assessment = assessGeofence(distanceMeters, radius, accuracy);

  const openDirections = () => {
    const origin =
      studentLatitude === null || studentLongitude === null
        ? undefined
        : `${studentLatitude},${studentLongitude}`;
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
          <Text style={styles.eyebrow}>BẢN ĐỒ ĐIỂM DANH</Text>
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
      <Pressable onPress={openDirections} style={styles.mapLink} accessibilityRole="link">
        <Text style={styles.mapTitle}>Mở vị trí và chỉ đường</Text>
        <Text style={styles.mapDescription}>
          Điểm đến cách vị trí của bạn {distanceMeters === null ? 'chưa xác định' : `${distanceMeters} m`}.
          {' '}Phạm vi điểm danh {radius} m.
        </Text>
        <Text style={styles.linkText}>Xem chỉ đường trên Google Maps →</Text>
      </Pressable>
      {assessment.nearBoundary && (
        <Text style={styles.boundaryWarning}>
          Vị trí gần ranh giới; sai số GPS ±{Math.round(accuracy ?? 0)} m có thể ảnh hưởng kết quả.
        </Text>
      )}
      <View style={styles.footer}>
        <Text style={styles.accuracyText}>
          {accuracy === null ? 'Đang chờ GPS…' : `Sai số GPS hiện tại ±${Math.round(accuracy)} m`}
        </Text>
        <Text style={styles.accuracyText}>
          {studentLatitude === null || studentLongitude === null
            ? 'Chưa có vị trí hiện tại'
            : `Điểm danh: ${sessionLatitude.toFixed(5)}, ${sessionLongitude.toFixed(5)}`}
        </Text>
      </View>
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
  distancePill: {
    alignItems: 'flex-end',
    borderRadius: 12,
    backgroundColor: '#EAF7F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  distanceValue: { color: '#16834B', fontSize: 17, fontWeight: '800' },
  distanceCaption: { color: '#738078', fontSize: 10 },
  mapLink: {
    height: 180,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F1F5F2',
    gap: 8,
  },
  mapTitle: { color: '#26352D', fontSize: 16, fontWeight: '700' },
  mapDescription: { color: '#738078', fontSize: 13, lineHeight: 19 },
  linkText: { color: '#16834B', fontSize: 13, fontWeight: '700' },
  boundaryWarning: {
    paddingHorizontal: 16,
    paddingTop: 10,
    color: '#946200',
    fontSize: 11,
    lineHeight: 16,
  },
  footer: { paddingHorizontal: 16, paddingVertical: 12, gap: 4 },
  accuracyText: { color: '#738078', fontSize: 11 },
});
