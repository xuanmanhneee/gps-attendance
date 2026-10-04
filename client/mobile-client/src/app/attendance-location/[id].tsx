import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import type { MyAttendanceSessionResponse } from '@gps-attendance/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AttendanceAPI } from '../../api/attendance.api';
import { ApiRequestError } from '../../api/api';
import { AttendanceLocationMap } from '../../components/attendance-location-map';
import { DluLogo } from '../../components/dlu-logo';
import { Card } from '../../components/ui/card';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../context/auth-context';
import { assessGeofence } from '../../utils/geofence-assessment';

type Session = MyAttendanceSessionResponse;

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có thời gian';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function InfoLine({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <View style={styles.infoLabel}>
        <MaterialCommunityIcons name={icon as never} size={16} color="#718078" />
        <Text style={styles.infoLabelText}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export default function AttendanceLocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, logout } = useAuth();
  const sessionId = Number(id);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    if (!token || !Number.isInteger(sessionId) || sessionId <= 0) {
      setLoadError('Mã phiên điểm danh không hợp lệ.');
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const response = await AttendanceAPI.getSessions(token);
      if (!response.success) throw new Error(response.message || 'Không thể tải phiên điểm danh.');
      const found = (Array.isArray(response.data) ? response.data : []).find((item) => item.id === sessionId);
      if (!found) {
        setLoadError('Không tìm thấy phiên điểm danh này.');
        setSession(null);
      } else {
        setSession(found);
        setLoadError(null);
      }
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        await logout();
        router.replace('/login');
      } else {
        setLoadError(error instanceof Error ? error.message : 'Không thể tải phiên điểm danh.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout, router, sessionId, token]);

  const refreshLocation = useCallback(async (requestPermission: boolean) => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationError('GPS đang tắt. Hãy bật Dịch vụ vị trí để xác định vị trí của bạn.');
        return null;
      }

      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted && requestPermission) {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (!permission.granted) {
        setLocationError('Ứng dụng chưa được cấp quyền truy cập vị trí.');
        return null;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
      setLocationError(null);
      return currentLocation;
    } catch (error) {
      console.error('Unable to refresh attendance location:', error);
      setLocationError('Không thể lấy vị trí hiện tại. Hãy kiểm tra GPS và thử lại.');
      return null;
    }
  }, []);

  useEffect(() => {
    void loadSession();
    void refreshLocation(false);
  }, [loadSession, refreshLocation]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshLocation(false);
    });
    return () => appStateSubscription.remove();
  }, [refreshLocation]);

  const distanceMeters = useMemo(() => {
    if (!session || !location) return null;
    const earthRadius = 6_371_000;
    const latitude1 = (location.coords.latitude * Math.PI) / 180;
    const latitude2 = (session.latitude * Math.PI) / 180;
    const latitudeDelta = ((session.latitude - location.coords.latitude) * Math.PI) / 180;
    const longitudeDelta = ((session.longitude - location.coords.longitude) * Math.PI) / 180;
    const a = Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;
    return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }, [location, session]);

  const assessment = assessGeofence(distanceMeters, session?.radius ?? 0, location?.coords.accuracy ?? null);
  const statusColor = assessment.status === 'inside'
    ? '#16834B'
    : assessment.status === 'outside'
      ? '#C2413A'
      : '#A56A00';
  const deviceName = Device.modelName ?? 'Thiết bị hiện tại';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadSession(), refreshLocation(true)]);
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang xác định vị trí điểm danh...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <MaterialCommunityIcons name="map-marker-off-outline" size={42} color="#C2413A" />
        <Text style={styles.errorTitle}>Không tải được vị trí</Text>
        <Text style={styles.errorText}>{loadError ?? 'Không tìm thấy phiên điểm danh.'}</Text>
        <Pressable onPress={() => router.back()} style={styles.backFallback}>
          <Text style={styles.backFallbackText}>Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 10), paddingBottom: 20 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#26352D" />
          </Pressable>
          <View style={styles.navTitleGroup}>
            <DluLogo size={28} />
            <Text style={styles.navTitle}>Vị trí điểm danh</Text>
          </View>
          <View style={styles.backPlaceholder} />
        </View>

        {locationError && !location && (
          <Pressable onPress={() => void refreshLocation(true)} style={styles.locationWarning}>
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#A56A00" />
            <View style={styles.warningCopy}>
              <Text style={styles.warningTitle}>Chưa có vị trí GPS</Text>
              <Text style={styles.warningText}>{locationError}</Text>
              <Text style={styles.retryText}>Chạm để cấp quyền / thử lại</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#A56A00" />
          </Pressable>
        )}

        <AttendanceLocationMap
          sessionTitle={session.title}
          sessionLatitude={session.latitude}
          sessionLongitude={session.longitude}
          radius={session.radius}
          studentLatitude={location?.coords.latitude ?? null}
          studentLongitude={location?.coords.longitude ?? null}
          accuracy={location?.coords.accuracy ?? null}
          distanceMeters={distanceMeters}
        />

        <Card style={styles.sessionCard}>
          <Text style={styles.sessionTitle}>{session.title}</Text>
          <Text style={styles.sessionSubtitle}>Phiên #{session.id} · Bán kính {session.radius} m</Text>
          <InfoLine icon="calendar-clock" label="Thời gian" value={`${formatDateTime(session.openAt)} – ${new Date(session.closeAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}`} />
          <InfoLine icon="map-marker" label="Vị trí lớp học" value={`${session.latitude.toFixed(6)}, ${session.longitude.toFixed(6)}`} />
          <InfoLine icon="crosshairs-gps" label="Vị trí của bạn" value={location ? `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}` : 'Chưa xác định'} />
          <InfoLine icon="cellphone" label="Thiết bị" value={deviceName} />
        </Card>

        <Card style={{ ...styles.resultCard, borderColor: `${statusColor}55` }}>
          <View style={[styles.resultIcon, { backgroundColor: `${statusColor}16` }]}>
            <MaterialCommunityIcons
              name={assessment.status === 'inside' ? 'check' : assessment.status === 'outside' ? 'close' : 'timer-sand'}
              size={22}
              color={statusColor}
            />
          </View>
          <View style={styles.resultCopy}>
            <Text style={[styles.resultTitle, { color: statusColor }]}>
              {assessment.status === 'inside'
                ? 'Vị trí phù hợp để điểm danh'
                : assessment.status === 'outside'
                  ? 'Vị trí chưa phù hợp'
                  : 'Đang chờ vị trí GPS'}
            </Text>
            <Text style={styles.resultDescription}>
              {distanceMeters === null
                ? 'Bật GPS để kiểm tra khoảng cách đến lớp.'
                : assessment.status === 'inside'
                  ? `Bạn đang cách lớp ${distanceMeters} m, trong bán kính ${session.radius} m.`
                  : `Bạn cách lớp ${distanceMeters} m, vượt bán kính ${session.radius} m.`}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Cập nhật vị trí" onPress={() => void handleRefresh()} style={styles.refreshButton}>
            {isRefreshing ? <ActivityIndicator size="small" color={COLORS.primary} /> : <MaterialCommunityIcons name="refresh" size={20} color={COLORS.primary} />}
          </Pressable>
        </Card>

        {assessment.nearBoundary && (
          <Text style={styles.boundaryWarning}>
            Vị trí gần ranh giới vùng cho phép. Sai số GPS ±{Math.round(location?.coords.accuracy ?? 0)} m có thể ảnh hưởng kết quả.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7F6' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#F5F7F6' },
  loadingText: { marginTop: 12, color: '#68736D', fontSize: 13 },
  errorTitle: { marginTop: 12, color: '#26352D', fontSize: 16, fontWeight: '700' },
  errorText: { marginTop: 6, color: '#68736D', fontSize: 13, textAlign: 'center' },
  backFallback: { marginTop: 18, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#EAF7F0', borderRadius: 10 },
  backFallbackText: { color: COLORS.primary, fontWeight: '700' },
  content: { paddingHorizontal: 14, gap: 12 },
  navHeader: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  backPlaceholder: { width: 36, height: 36 },
  navTitle: { color: '#24352C', fontSize: 15, fontWeight: '800' },
  navTitleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  locationWarning: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: '#FFF7E6', borderWidth: 1, borderColor: '#F4D99D' },
  warningCopy: { flex: 1 },
  warningTitle: { color: '#6D4B0C', fontSize: 12, fontWeight: '800' },
  warningText: { marginTop: 3, color: '#80662D', fontSize: 11, lineHeight: 15 },
  retryText: { marginTop: 5, color: '#946200', fontSize: 11, fontWeight: '700' },
  sessionCard: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 15, backgroundColor: '#FFFFFF' },
  sessionTitle: { marginBottom: 3, color: '#25352D', fontSize: 14, fontWeight: '800' },
  sessionSubtitle: { marginBottom: 2, color: '#748078', fontSize: 11 },
  infoLine: { minHeight: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E9EEEB' },
  infoLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  infoLabelText: { color: '#6B756F', fontSize: 11 },
  infoValue: { flex: 1, color: '#26352D', fontSize: 11, fontWeight: '600', textAlign: 'right' },
  resultCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, backgroundColor: '#FFFFFF' },
  resultIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  resultCopy: { flex: 1 },
  resultTitle: { fontSize: 12, fontWeight: '800' },
  resultDescription: { marginTop: 3, color: '#6B756F', fontSize: 10, lineHeight: 14 },
  refreshButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF7F0' },
  boundaryWarning: { paddingHorizontal: 6, color: '#946200', fontSize: 11, lineHeight: 16 },
});
