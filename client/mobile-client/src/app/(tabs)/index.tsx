import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Alert,
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
        await logout();
        router.replace('/login');
        return;
      }
      Alert.alert('Lỗi', 'Không thể tải danh sách buổi học');
    } finally {
      if (showLoader) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  const handleRefresh = async () => {
    await loadSessions(false);
  };

  const startLocationTracking = async (): Promise<Location.LocationSubscription | undefined> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Lỗi',
          'Ứng dụng cần quyền truy cập vị trí để hoạt động',
        );
        return undefined;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);

      // Subscribe to location updates
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update if moved 10 meters
        },
        (newLocation) => {
          setLocation(newLocation);
        },
      );

      return subscription;
    } catch (error) {
      console.error('Failed to get location:', error);
      Alert.alert('Lỗi', 'Không thể truy cập GPS');
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
    if (!location) {
      Alert.alert('Lỗi', 'Chưa có thông tin vị trí. Vui lòng đợi...');
      return;
    }

    try {
      setIsCheckingIn(true);
      setSelectedSessionId(sessionId);

      if (!token) throw new Error('Phiên đăng nhập đã hết hạn');
      const response = await AttendanceAPI.checkIn(
        {
          sessionId,
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy ?? 0,
            timestamp: location.timestamp,
            isMockLocation: location.mocked ?? false,
          },
          device: {
            deviceId: Device.osBuildId ?? Device.modelId ?? 'unknown-device',
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

        const successMessage =
          validation.status === 'REVIEW'
            ? 'Điểm danh đã được ghi nhận, đang chờ xét duyệt.'
            : 'Điểm danh thành công.';

        Alert.alert('Thành công', successMessage);
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
        [selectedSessionId ?? 0]: 'failed',
      }));

      Alert.alert('Lỗi', apiMessage);
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
            paddingBottom: Math.max(insets.bottom, 20) + 24,
          },
        ]}
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

                  <Button
                    title={
                      isCompleted
                        ? 'Hoàn thành'
                        : isFailed
                          ? 'Thử lại'
                          : isCheckingIn && selectedSessionId === session.id
                            ? 'Đang xử lý...'
                            : 'Điểm Danh'
                    }
                    onPress={() => handleCheckIn(session.id)}
                    disabled={
                      isCompleted ||
                      isCheckingIn ||
                      session.status !== 'open'
                    }
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
