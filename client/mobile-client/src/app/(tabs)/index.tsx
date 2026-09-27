import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import { useAuth } from '../../context/auth-context';
import { ApiRequestError } from '../../api/api';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { GPSStatusCard } from '../../components/gps-status-card';
import { AttendanceModal } from '../../components/attendance-modal';
import { AttendanceAPI } from '../../api/attendance.api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { appAlert } from '../../utils/app-alert';
import { getStableDeviceId } from '../../services/device-id';

interface Session {
  id: number;
  title: string;
  status: string;
  openAt: string;
  closeAt: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export default function AttendanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token, logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [isLocating, setIsLocating] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null,
  );
  const [validationResult, setValidationResult] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<
    Record<number, 'idle' | 'completed' | 'failed'>
  >({});

  useEffect(() => {
    if (!token) return;
    loadSessions();
    let subscription: Location.LocationSubscription | undefined;
    startLocationTracking().then((createdSubscription) => {
      subscription = createdSubscription;
    });
    return () => subscription?.remove();
  }, [token]);

  const loadSessions = async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      if (!token) return;
      const response = await AttendanceAPI.getSessions(token);
      if (!response.success) throw new Error(response.message);
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      if (error instanceof ApiRequestError && error.status === 401) {
        appAlert('Phiên làm việc hết hạn', 'Token đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        await logout();
        router.replace('/login');
        return;
      }
      const errorMsg = error instanceof Error ? error.message : 'Không thể tải danh sách buổi học';
      appAlert('Lỗi kết nối', errorMsg);
    } finally {
      if (showLoader) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadSessions(false), startLocationTracking()]);
  };

  const startLocationTracking = async (): Promise<Location.LocationSubscription | undefined> => {
    try {
      setIsLocating(true);
      setGpsError(null);

      // 1. Kiểm tra GPS trên thiết bị đã bật chưa
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        const msg = 'GPS chưa bật. Vui lòng bật Dịch vụ định vị trong Cài đặt thiết bị.';
        setGpsError(msg);
        setIsLocating(false);
        appAlert('GPS chưa bật', msg);
        return undefined;
      }

      // 2. Kiểm tra quyền truy cập vị trí
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const msg = 'Ứng dụng cần quyền truy cập vị trí để hoạt động.';
        setGpsError(msg);
        setIsLocating(false);
        appAlert('Chưa cấp quyền GPS', msg);
        return undefined;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
      setIsLocating(false);

      // Theo dõi vị trí liên tục
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setLocation(newLocation);
          setIsLocating(false);
        },
      );

      return subscription;
    } catch (error) {
      console.error('Failed to get location:', error);
      const msg = 'Không thể truy cập GPS. Vui lòng kiểm tra dịch vụ định vị.';
      setGpsError(msg);
      setIsLocating(false);
      appAlert('Lỗi GPS', msg);
    }
  };

  const getDistanceInMeters = (session: Session) => {
    if (!location) return null;
    const earthRadius = 6371000;
    const lat1 = (location.coords.latitude * Math.PI) / 180;
    const lat2 = (session.latitude * Math.PI) / 180;
    const deltaLat = ((session.latitude - location.coords.latitude) * Math.PI) / 180;
    const deltaLng = ((session.longitude - location.coords.longitude) * Math.PI) / 180;
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const handleCheckIn = async (sessionId: number) => {
    const session = sessions.find((item) => item.id === sessionId);

    if (session && session.status !== 'open') {
      appAlert(
        'Phiên chưa mở',
        session.status === 'pending'
          ? 'Buổi điểm danh chưa tới giờ mở. Nút bị tắt cho đến khi phiên chuyển sang trạng thái Mở.'
          : 'Buổi điểm danh đã đóng. Không thể điểm danh.',
      );
      return;
    }

    if (!location) {
      appAlert('Chưa có GPS', 'Chưa có thông tin vị trí. Hãy bật GPS, cấp quyền vị trí, rồi bấm Làm mới.');
      return;
    }

    const { latitude, longitude, accuracy } = location.coords;

    if (
      typeof latitude !== 'number' ||
      latitude < -90 ||
      latitude > 90 ||
      typeof longitude !== 'number' ||
      longitude < -180 ||
      longitude > 180
    ) {
      appAlert('Lỗi tọa độ', 'Tọa độ GPS không hợp lệ. Vui lòng kiểm tra lại thiết bị.');
      return;
    }

    const currentAccuracy = accuracy ?? 0;
    if (currentAccuracy > 1000) {
      appAlert(
        'Sai số GPS không hợp lệ',
        `Thiết bị báo sai số ${Math.round(currentAccuracy)}m. Hãy bật GPS, ra chỗ thoáng rồi thử lại.`,
      );
      return;
    }

    try {
      setIsCheckingIn(true);
      setSelectedSessionId(sessionId);

      if (!token) throw new Error('Phiên đăng nhập đã hết hạn');
      const deviceId = await getStableDeviceId();
      const response = await AttendanceAPI.checkIn(
        {
          sessionId,
          location: {
            latitude,
            longitude,
            accuracy: Math.max(0, currentAccuracy),
            timestamp: location.timestamp,
            isMockLocation: location.mocked ?? false,
          },
          device: {
            deviceId,
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
            model: Device.modelName ?? 'unknown-model',
          },
          integrity: { integrityToken: null },
        },
        token,
      );

      if (!response.success) {
        throw new Error(response.message || 'Điểm danh không thành công');
      }

      const validation = response.data;
      setValidationResult(validation);

      if (validation.status === 'VALID' || validation.status === 'REVIEW') {
        setSessionStatus((prev) => ({
          ...prev,
          [sessionId]: 'completed',
        }));
        setShowModal(true);
        return;
      }

      setSessionStatus((prev) => ({
        ...prev,
        [sessionId]: 'failed',
      }));
      setShowModal(true);
    } catch (error) {
      console.error('Check-in failed:', error);
      const apiMessage =
        error instanceof ApiRequestError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Điểm danh không thành công';

      setSessionStatus((prev) => ({
        ...prev,
        [sessionId]: 'failed',
      }));

      appAlert('Lỗi điểm danh', apiMessage);
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top + 16 }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 20) + 16,
            paddingBottom: 64 + insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
            title="Kéo xuống để làm mới"
            titleColor={COLORS.text.secondary}
          />
        }
      >
        <View style={styles.centerWrapper}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Xin chào, {user?.name}</Text>
            <Text style={styles.headerSubtitle}>Chọn buổi học để điểm danh</Text>
          </View>

          {isLocating && !location && (
            <Card style={styles.locatingCard}>
              <View style={styles.locatingRow}>
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 10 }} />
                <Text style={styles.locatingText}>
                  Đang lấy tọa độ GPS... Vui lòng chờ thiết bị kết nối vệ tinh
                </Text>
              </View>
            </Card>
          )}

          {gpsError && !location && (
            <Card style={styles.gpsErrorCard}>
              <Text style={styles.gpsErrorTitle}>⚠️ Lỗi GPS: Chưa bật hoặc chưa cấp quyền</Text>
              <Text style={styles.gpsErrorSubtitle}>{gpsError}</Text>
              <Button
                title="Bật lại GPS & Thử lại"
                onPress={() => startLocationTracking()}
                variant="outline"
                style={{ marginTop: 10 }}
              />
            </Card>
          )}

          {location && (
            <GPSStatusCard
              location={location}
              distance={sessions[0] ? getDistanceInMeters(sessions[0]) : null}
            />
          )}

          <Button
            title={isRefreshing ? 'Đang tải...' : 'Làm mới'}
            onPress={handleRefresh}
            disabled={isRefreshing || isCheckingIn || isLoading}
            variant="primary"
            style={styles.refreshButton}
          />

          {sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Không có buổi học nào sắp diễn ra
              </Text>
            </View>
          ) : (
            sessions.map((session) => {
              const isCompleted = sessionStatus[session.id] === 'completed';
              const isFailed = sessionStatus[session.id] === 'failed';

              return (
                <Card key={session.id} style={styles.sessionCard}>
                  <Text style={styles.sessionTitle}>{session.title}</Text>
                  <Text style={styles.sessionTime}>
                    {new Date(session.openAt).toLocaleTimeString('vi-VN')} -{' '}
                    {new Date(session.closeAt).toLocaleTimeString('vi-VN')}
                  </Text>
                  <Text style={styles.sessionStatus}>
                    Trạng thái: {session.status === 'open' ? '🟢 Mở' : '⚫ Đóng'}
                  </Text>
                  {getDistanceInMeters(session) !== null && (
                    <Text style={styles.sessionDistance}>
                      Khoảng cách: {getDistanceInMeters(session)} m
                    </Text>
                  )}
                  <Text style={styles.sessionDistance}>
                    Phạm vi: {session.radius} m | Sai số GPS: ±{Math.round(location?.coords.accuracy ?? 0)} m
                  </Text>
                  {(location?.coords.accuracy ?? 0) > 30 && (
                    <Text style={styles.sessionHint}>
                      Sai số GPS cao: điểm danh vẫn gửi được. Nếu vòng sai số cắt mép lớp, kết quả có thể là xem xét (Review).
                    </Text>
                  )}

                  <Button
                    title={
                      isCompleted
                        ? 'Check-in thành công'
                        : isFailed
                          ? 'Thử lại'
                          : isCheckingIn && selectedSessionId === session.id
                            ? 'Đang gửi dữ liệu...'
                            : session.status !== 'open'
                              ? session.status === 'pending'
                                ? 'Chưa tới giờ'
                                : 'Phiên đã đóng'
                              : 'Điểm Danh'
                    }
                    onPress={() => handleCheckIn(session.id)}
                    disabled={isCompleted || isCheckingIn}
                    variant={isCompleted ? 'secondary' : 'primary'}
                    style={
                      isCompleted
                        ? styles.completedButton
                        : styles.checkInButton
                    }
                  />
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>

      <AttendanceModal
        visible={showModal}
        result={validationResult}
        onClose={() => {
          setShowModal(false);
          setValidationResult(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  centerWrapper: {
    width: '100%',
    maxWidth: 480,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  sessionList: {
    flex: 1,
  },
  locatingCard: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
  },
  locatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locatingText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
    flex: 1,
  },
  gpsErrorCard: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
  },
  gpsErrorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: 4,
  },
  gpsErrorSubtitle: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  refreshButton: {
    marginBottom: 12,
    borderRadius: 10,
  },
  checkInButton: {
    backgroundColor: COLORS.primary,
  },
  completedButton: {
    backgroundColor: '#2E7D32',
  },
  sessionCard: {
    marginBottom: 12,
    padding: 16,
    gap: 8,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  sessionTime: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  sessionStatus: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  sessionDistance: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  sessionHint: {
    fontSize: 12,
    color: COLORS.warning,
    lineHeight: 16,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});
