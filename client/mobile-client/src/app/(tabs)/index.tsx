import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { GPSStatusCard } from '../../components/gps-status-card';
import { AttendanceModal } from '../../components/attendance-modal';
import { AttendanceAPI } from '../../api/attendance.api';
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
  const { user, token } = useAuth();
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

  useEffect(() => {
    if (!token) return;
    loadSessions();
    let subscription: Location.LocationSubscription | undefined;
    startLocationTracking().then((createdSubscription) => {
      subscription = createdSubscription;
    });
    return () => subscription?.remove();
  }, [token]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      if (!token) return;
      const response = await AttendanceAPI.getSessions(token);
      if (!response.success) throw new Error(response.message);
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách buổi học');
    } finally {
      setIsLoading(false);
    }
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
      const response = await AttendanceAPI.checkIn({
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
      }, token);
      if (!response.success) throw new Error(response.message);
      setValidationResult(response.data);
      setShowModal(true);
    } catch (error) {
      console.error('Check-in failed:', error);
      Alert.alert('Lỗi', 'Điểm danh không thành công');
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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

      <ScrollView
        style={styles.sessionList}
        showsVerticalScrollIndicator={false}
      >
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Không có buổi học nào sắp diễn ra
            </Text>
          </View>
        ) : (
          sessions.map((session) => (
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

              <Button
                title={isCheckingIn ? 'Đang xử lý...' : 'Điểm Danh'}
                onPress={() => handleCheckIn(session.id)}
                disabled={
                  isCheckingIn || session.status !== 'open'
                }
              />
            </Card>
          ))
        )}
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
    paddingHorizontal: 16,
    paddingTop: 16,
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
