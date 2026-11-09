import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import type { MyAttendanceSessionResponse } from '@gps-attendance/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiRequestError } from '../../api/api';
import { AttendanceAPI, type ValidationResult } from '../../api/attendance.api';
import { AttendanceModal } from '../../components/attendance-modal';
import { DluLogo } from '../../components/dlu-logo';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../context/auth-context';
import { getStableDeviceId } from '../../services/device-id';
import { checkDeviceSecurity, getIntegrity } from '../../services/integrity';
import {
  LocationAccuracyError,
  sanitizeLocationAccuracy,
} from '../../services/location';
import { appAlert } from '../../utils/app-alert';

type Session = MyAttendanceSessionResponse;
type DeviceSetting = 'gps' | 'wifi' | 'app';
type CheckInState = 'completed' | 'review' | 'failed' | null;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ngày chưa xác định';
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(value: string | null): string {
  if (!value) return 'Chưa điểm danh';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa điểm danh';
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatClock(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getDistanceInMeters(
  latitude: number,
  longitude: number,
  targetLatitude: number,
  targetLongitude: number,
): number {
  const earthRadius = 6_371_000;
  const lat1 = (latitude * Math.PI) / 180;
  const lat2 = (targetLatitude * Math.PI) / 180;
  const deltaLat = ((targetLatitude - latitude) * Math.PI) / 180;
  const deltaLng = ((targetLongitude - longitude) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function InfoRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: IconName;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelGroup}>
        <MaterialCommunityIcons name={icon} size={16} color="#7B8580" />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function AttendanceSessionDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, logout } = useAuth();
  const sessionId = Number(id);

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [gpsEnabled, setGpsEnabled] = useState<boolean | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean | null>(null);
  const [wifiConnected, setWifiConnected] = useState<boolean | null>(null);
  const [deviceSecurity, setDeviceSecurity] = useState<Awaited<ReturnType<typeof checkDeviceSecurity>> | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInState, setCheckInState] = useState<CheckInState>(null);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const loadSession = useCallback(async () => {
    if (!token || !Number.isInteger(sessionId) || sessionId <= 0) {
      setLoadError('Mã lớp điểm danh không hợp lệ.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await AttendanceAPI.getSessions(token);
      if (!response.success) {
        throw new Error(response.message || 'Không thể tải thông tin điểm danh.');
      }
      const found = (Array.isArray(response.data) ? response.data : []).find(
        (item) => item.id === sessionId,
      );
      if (!found) {
        setLoadError('Không tìm thấy lớp điểm danh hoặc bạn không được phân vào lớp này.');
        setSession(null);
        return;
      }
      setSession(found);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        await logout();
        router.replace('/login');
      } else {
        setLoadError(error instanceof Error ? error.message : 'Không thể tải thông tin điểm danh.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout, router, sessionId, token]);

  const refreshDeviceReadiness = useCallback(async () => {
    let servicesEnabled = false;
    let permissionGranted = false;

    try {
      const [services, permission, security] = await Promise.all([
        Location.hasServicesEnabledAsync(),
        Location.getForegroundPermissionsAsync(),
        checkDeviceSecurity(),
      ]);
      servicesEnabled = services;
      permissionGranted = permission.granted;
      setGpsEnabled(services);
      setLocationPermissionGranted(permission.granted);
      setDeviceSecurity(security);
    } catch (error) {
      console.warn('Unable to read location readiness:', error);
      setGpsEnabled(null);
      setLocationPermissionGranted(null);
    }

    try {
      const network = await Network.getNetworkStateAsync();
      setWifiConnected(
        network.type === Network.NetworkStateType.WIFI && network.isConnected === true,
      );
    } catch (error) {
      console.warn('Unable to read Wi-Fi state:', error);
      setWifiConnected(null);
    }

    if (servicesEnabled && permissionGranted) {
      try {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(current);
      } catch (error) {
        console.warn('Unable to get current location:', error);
      }
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    void refreshDeviceReadiness();
    const networkSubscription = Network.addNetworkStateListener((network) => {
      setWifiConnected(
        network.type === Network.NetworkStateType.WIFI && network.isConnected === true,
      );
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshDeviceReadiness();
    });

    return () => {
      networkSubscription.remove();
      appStateSubscription.remove();
    };
  }, [refreshDeviceReadiness]);

  const openDeviceSettings = async (setting: DeviceSetting) => {
    try {
      if (Platform.OS === 'android' && setting === 'gps') {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS,
        );
        return;
      }
      if (Platform.OS === 'android' && setting === 'wifi') {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.WIFI_SETTINGS,
        );
        return;
      }
      if (Platform.OS !== 'web') {
        await Linking.openSettings();
        return;
      }
      appAlert('Cần bật chức năng', 'Hãy bật chức năng tương ứng trong cài đặt của thiết bị.');
    } catch (error) {
      console.error('Unable to open settings:', error);
      appAlert('Không mở được Cài đặt', 'Vui lòng mở Cài đặt thiết bị và bật chức năng tương ứng.');
    }
  };

  const promptToEnable = (setting: DeviceSetting, title: string, message: string) => {
    if (Platform.OS === 'web') {
      appAlert(title, message);
      return;
    }
    if (Platform.OS === 'ios' && setting === 'wifi') {
      Alert.alert(title, `${message}\n\nMở Cài đặt > Wi‑Fi để bật kết nối.`, [
        { text: 'Đã hiểu', style: 'cancel' },
      ]);
      return;
    }
    Alert.alert(title, message, [
      { text: 'Để sau', style: 'cancel' },
      { text: 'Mở Cài đặt', onPress: () => void openDeviceSettings(setting) },
    ]);
  };

  const requestCurrentLocation = async (requestPermission: boolean) => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      setGpsEnabled(servicesEnabled);
      if (!servicesEnabled) {
        promptToEnable(
          'gps',
          'GPS đang tắt',
          'Hãy bật Dịch vụ vị trí/GPS trên thiết bị rồi quay lại ứng dụng.',
        );
        return null;
      }

      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted && requestPermission) {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      setLocationPermissionGranted(permission.granted);
      if (!permission.granted) {
        if (requestPermission) {
          promptToEnable(
            'app',
            'Cần quyền vị trí',
            'Hãy cho phép ứng dụng truy cập vị trí khi sử dụng để điểm danh GPS.',
          );
        }
        return null;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(current);
      setGpsEnabled(true);
      setLocationPermissionGranted(true);
      return current;
    } catch (error) {
      console.error('Unable to read current location:', error);
      appAlert('Lỗi GPS', 'Không thể lấy vị trí hiện tại. Hãy kiểm tra GPS và quyền vị trí.');
      return null;
    }
  };

  const handleGpsPress = async () => {
    await requestCurrentLocation(true);
  };

  const handleWifiPress = async () => {
    try {
      const network = await Network.getNetworkStateAsync();
      const connected =
        network.type === Network.NetworkStateType.WIFI && network.isConnected === true;
      setWifiConnected(connected);
      if (connected) {
        appAlert('Wi‑Fi đã kết nối', 'Thiết bị hiện đang sử dụng kết nối Wi‑Fi.');
      } else {
        promptToEnable(
          'wifi',
          'Wi‑Fi chưa kết nối',
          'Hãy bật Wi‑Fi và kết nối vào mạng. Trạng thái sẽ tự cập nhật khi quay lại ứng dụng.',
        );
      }
    } catch (error) {
      console.error('Unable to read Wi-Fi state:', error);
      setWifiConnected(null);
      promptToEnable(
        'wifi',
        'Không kiểm tra được Wi‑Fi',
        'Hãy kiểm tra Wi‑Fi trong Cài đặt thiết bị rồi quay lại ứng dụng.',
      );
    }
  };

  const handleDeviceSafetyPress = async () => {
    const security = await checkDeviceSecurity();
    setDeviceSecurity(security);
    if (!security.isRealDevice) {
      appAlert('Thiết bị chưa đạt kiểm tra', 'Ứng dụng đang chạy trên thiết bị mô phỏng / máy ảo. Hãy dùng thiết bị thật.');
      return;
    }
    if (location?.mocked) {
      appAlert('Phát hiện vị trí giả lập', 'Hãy tắt ứng dụng giả lập vị trí (Fake GPS) trước khi điểm danh.');
      return;
    }

    if (security.isRooted) {
      appAlert('Cảnh báo can thiệp hệ thống', 'Thiết bị đã bị Root / Jailbreak. Vui lòng sử dụng thiết bị nguyên bản để đảm bảo an toàn.');
      return;
    }

    appAlert(
      'Kiểm tra thiết bị hoàn tất',
      'Thiết bị vượt qua các kiểm tra cục bộ. Xác minh chứng thực từ nhà cung cấp chưa được cấu hình.',
    );
  };

  const handleCheckIn = async () => {
    if (!session) return;
    if (session.status !== 'open') {
      appAlert(
        session.status === 'pending' ? 'Phiên chưa mở' : 'Phiên đã kết thúc',
        session.status === 'pending'
          ? 'Buổi điểm danh chưa tới giờ mở. Bạn có thể quay lại khi phiên bắt đầu.'
          : 'Phiên điểm danh này không còn nhận điểm danh.',
      );
      return;
    }
    if (session.myAttendance.checkedInAt || session.myAttendance.status !== 'absent') {
      appAlert('Đã điểm danh', 'Bạn đã có trạng thái điểm danh cho phiên này.');
      return;
    }
    const currentLocation = await requestCurrentLocation(true);
    if (!currentLocation) return;

    const { latitude, longitude, accuracy } = currentLocation.coords;
    if (
      typeof latitude !== 'number' || latitude < -90 || latitude > 90 ||
      typeof longitude !== 'number' || longitude < -180 || longitude > 180
    ) {
      appAlert('Lỗi tọa độ', 'Tọa độ GPS không hợp lệ. Vui lòng kiểm tra lại thiết bị.');
      return;
    }
    let currentAccuracy: number;
    try {
      currentAccuracy = sanitizeLocationAccuracy(accuracy);
    } catch (error) {
      if (!(error instanceof LocationAccuracyError)) throw error;
      appAlert(
        'Sai số GPS không hợp lệ',
        'Không xác định được sai số GPS hoặc sai số vượt quá 100 m. Hãy ra chỗ thoáng rồi thử lại.',
      );
      return;
    }

    try {
      setIsCheckingIn(true);
      if (!token) throw new Error('Phiên đăng nhập đã hết hạn');
      const deviceId = await getStableDeviceId();
      const response = await AttendanceAPI.checkIn(
        {
          sessionId: session.id,
          location: {
            latitude,
            longitude,
            accuracy: currentAccuracy,
            timestamp: currentLocation.timestamp,
            isMockLocation: currentLocation.mocked ?? false,
          },
          device: {
            deviceId,
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
            model: Device.modelName ?? 'unknown-model',
          },
          integrity: await getIntegrity(),
        },
        token,
      );

      if (!response.success) throw new Error(response.message || 'Điểm danh không thành công');
      setValidationResult(response.data);
      setCheckInTime(new Date().toISOString());
      setCheckInState(
        response.data.status === 'VALID'
          ? 'completed'
          : response.data.status === 'REVIEW'
            ? 'review'
            : 'failed',
      );
      setShowResultModal(true);
      if (response.data.status === 'VALID') {
        setSession((current) => current
          ? { ...current, myAttendance: { status: 'present', checkedInAt: new Date().toISOString() } }
          : current);
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Không thể thực hiện điểm danh.';
      const status = error instanceof ApiRequestError ? error.status : null;
      console.error('Check-in failed:', { message, httpStatus: status });
      setCheckInState('failed');
      appAlert(
        'Điểm danh thất bại',
        status && status > 0 ? `${message}\nMã HTTP: ${status}` : message,
      );
    } finally {
      setIsCheckingIn(false);
    }
  };

  const distanceMeters = useMemo(() => {
    if (!session || !location) return null;
    return getDistanceInMeters(
      location.coords.latitude,
      location.coords.longitude,
      session.latitude,
      session.longitude,
    );
  }, [location, session]);

  const gpsStatus =
    gpsEnabled === null || locationPermissionGranted === null
      ? 'Đang kiểm tra'
      : !locationPermissionGranted
        ? 'Cần cấp quyền'
        : gpsEnabled
          ? 'Bật'
          : 'Tắt';
  const wifiStatus = wifiConnected === null
    ? 'Đang kiểm tra'
    : wifiConnected
      ? 'Đã kết nối'
      : 'Chưa kết nối';
  const isDeviceSafe = deviceSecurity ? deviceSecurity.isSafe && !location?.mocked : false;
  const safetyStatus = !deviceSecurity
    ? 'Đang kiểm tra'
    : !deviceSecurity.isRealDevice
      ? 'Thiết bị ảo'
      : deviceSecurity.isRooted
        ? 'Đã Root'
        : location?.mocked
          ? 'Không an toàn'
          : 'An toàn';
  const safetyStatusColor = !deviceSecurity
    ? styles.warningValue
    : isDeviceSafe
      ? styles.goodValue
      : styles.badValue;
  const attendanceStatus = checkInState === 'completed'
    ? 'Thành công'
    : checkInState === 'review'
      ? 'Chờ xem xét'
      : checkInState === 'failed'
        ? 'Thử lại'
        : session?.myAttendance.status === 'present'
          ? 'Đã điểm danh'
          : session?.myAttendance.status === 'late'
            ? 'Đi muộn'
            : session?.myAttendance.status === 'excused'
              ? 'Có phép'
              : session?.status === 'open'
                ? 'Chưa điểm danh'
                : session?.status === 'pending'
                  ? 'Sắp mở'
                  : 'Đã kết thúc';

  const openMap = async () => {
    if (!session) return;
    router.push({
      pathname: '/attendance-location/[id]',
      params: { id: String(session.id) },
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải chi tiết điểm danh...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={42} color="#C2413A" />
        <Text style={styles.errorTitle}>Không tải được chi tiết</Text>
        <Text style={styles.errorMessage}>{loadError ?? 'Không tìm thấy phiên điểm danh.'}</Text>
        <Button title="Quay lại" onPress={() => router.back()} style={styles.errorBackButton} />
      </View>
    );
  }

  const alreadyAttended = session.myAttendance.checkedInAt !== null ||
    session.myAttendance.status !== 'absent';
  const checkInDisabled = isCheckingIn || session.status !== 'open' || alreadyAttended;
  const isWithinRange = distanceMeters !== null && distanceMeters <= session.radius;
  const statusColor = checkInState === 'failed' || session.status === 'closed'
    ? '#C2413A'
    : checkInState === 'review'
      ? '#A56A00'
      : alreadyAttended || checkInState === 'completed'
        ? '#16834B'
        : session.status === 'open'
          ? '#16834B'
          : '#A56A00';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 12), paddingBottom: 18 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navigationHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#25352C" />
          </Pressable>
          <View style={styles.navigationTitleGroup}>
            <DluLogo size={28} />
            <Text style={styles.navigationTitle}>Chi tiết điểm danh</Text>
          </View>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <Card style={styles.sessionCard}>
          <View style={styles.sessionCardTop}>
            <View style={styles.sessionIcon}>
              <MaterialCommunityIcons name="map-marker-check" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.sessionHeading}>
              <Text style={styles.sessionTitle}>{session.title}</Text>
                <Text style={styles.sessionSubtitle}>
                  Phiên #{session.id} · {session.location?.room?.code ?? 'Chưa gán phòng'} · Bán kính {session.radius} m
                </Text>
            </View>
            <View style={[styles.statusBadge, session.status === 'open' ? styles.openBadge : styles.pendingBadge]}>
              <Text style={[styles.statusBadgeText, session.status === 'open' ? styles.openText : styles.pendingText]}>
                {session.status === 'open' ? 'Đang mở' : session.status === 'pending' ? 'Sắp mở' : 'Đã kết thúc'}
              </Text>
            </View>
          </View>
          <View style={styles.scheduleRow}>
            <MaterialCommunityIcons name="calendar-clock" size={15} color={COLORS.primary} />
            <Text style={styles.scheduleText}>
              {formatDate(session.openAt)} · {formatClock(session.openAt)} – {formatClock(session.closeAt)}
            </Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Thông tin điểm danh</Text>
        <Card style={styles.detailsCard}>
          <InfoRow
            icon="domain"
            label="Phòng / tòa"
            value={[
              session.location?.room?.code,
              session.location?.building?.code,
            ].filter(Boolean).join(' · ') || 'Địa điểm chưa liên kết'}
          />
          <InfoRow
            icon="crosshairs-gps"
            label="Tâm GPS cố định"
            value={`${session.latitude.toFixed(6)}, ${session.longitude.toFixed(6)}`}
          />
          <InfoRow
            icon="clock-outline"
            label="Thời gian điểm danh"
            value={formatTime(checkInTime ?? session.myAttendance.checkedInAt)}
          />
          <InfoRow icon="autorenew" label="Hình thức" value="Tự động (GPS + Wi‑Fi)" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở bản đồ và kiểm tra vị trí điểm danh"
            onPress={() => void openMap()}
            style={{ width: '100%' }}
          >
            <InfoRow
              icon="map-marker-outline"
              label="Vị trí"
              value={location ? isWithinRange ? 'Trong phạm vi cho phép' : 'Ngoài phạm vi cho phép' : 'Chưa xác định'}
              valueColor={location ? isWithinRange ? '#16834B' : '#C2413A' : undefined}
            />
          </Pressable>
          <InfoRow
            icon="map-marker-distance"
            label="Khoảng cách"
            value={distanceMeters === null ? 'Chưa xác định' : `${distanceMeters} m / bán kính ${session.radius} m`}
          />
          <InfoRow
            icon="target"
            label="GPS Accuracy thiết bị"
            value={
              location?.coords.accuracy == null
                ? 'Chưa xác định'
                : `±${Math.round(location.coords.accuracy)} m`
            }
          />
          <Pressable accessibilityRole="button" onPress={() => void handleGpsPress()} style={styles.infoRow}>
            <View style={styles.infoLabelGroup}>
              <MaterialCommunityIcons name="crosshairs-gps" size={16} color="#7B8580" />
              <Text style={styles.infoLabel}>GPS</Text>
            </View>
            <Text style={[styles.infoValue, gpsEnabled && locationPermissionGranted ? styles.goodValue : styles.warningValue]}>{gpsStatus}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void handleWifiPress()} style={styles.infoRow}>
            <View style={styles.infoLabelGroup}>
              <MaterialCommunityIcons name="wifi" size={16} color="#7B8580" />
              <Text style={styles.infoLabel}>Wi‑Fi</Text>
            </View>
            <Text style={[styles.infoValue, wifiConnected ? styles.goodValue : styles.warningValue]}>{wifiStatus}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={handleDeviceSafetyPress} style={styles.infoRow}>
            <View style={styles.infoLabelGroup}>
              <MaterialCommunityIcons name="shield-check-outline" size={16} color="#7B8580" />
              <Text style={styles.infoLabel}>Thiết bị</Text>
            </View>
            <Text style={[styles.infoValue, safetyStatusColor]} numberOfLines={1}>
              {Device.modelName ?? 'Thiết bị'} · {safetyStatus}
            </Text>
          </Pressable>
          <InfoRow icon="check-circle-outline" label="Trạng thái" value={attendanceStatus} valueColor={statusColor} />
        </Card>

        <Text style={styles.hintText}>
          GPS xác minh vị trí của thiết bị trong khu vực học tập, không chứng minh danh tính người đang cầm thiết bị. Chạm GPS hoặc Wi‑Fi nếu cần mở cài đặt.
        </Text>
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable accessibilityRole="button" onPress={() => void openMap()} style={styles.mapButton}>
          <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={COLORS.primary} />
          <Text style={styles.mapButtonText}>Xem vị trí điểm danh</Text>
        </Pressable>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.85}
          onPress={() => void handleCheckIn()}
          disabled={checkInDisabled}
          style={[styles.checkInButton, checkInDisabled && styles.checkInButtonDisabled]}
        >
          {isCheckingIn ? <ActivityIndicator color="#FFFFFF" /> : <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />}
          <Text style={styles.checkInButtonText}>
            {isCheckingIn
              ? 'Đang điểm danh...'
              : alreadyAttended
                ? 'Đã điểm danh'
                : session.status === 'pending'
                  ? 'Chưa đến giờ điểm danh'
                  : session.status !== 'open'
                    ? 'Phiên đã kết thúc'
                    : 'Điểm danh'}
          </Text>
        </TouchableOpacity>
      </View>

      <AttendanceModal
        visible={showResultModal}
        result={validationResult}
        onClose={() => setShowResultModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7F6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: '#F5F7F6' },
  loadingText: { marginTop: 12, color: '#68736D', fontSize: 14 },
  errorTitle: { marginTop: 12, color: '#24352C', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  errorMessage: { marginTop: 6, color: '#707A73', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  errorBackButton: { marginTop: 18, minWidth: 140 },
  content: { paddingHorizontal: 16, gap: 14 },
  navigationHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  backButtonPlaceholder: { width: 38, height: 38 },
  navigationTitle: { color: '#26352D', fontSize: 16, fontWeight: '700' },
  navigationTitleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  sessionCard: { padding: 14, borderRadius: 17, backgroundColor: '#FFFFFF' },
  sessionCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#EAF7F0', alignItems: 'center', justifyContent: 'center' },
  sessionHeading: { flex: 1 },
  sessionTitle: { color: '#24352C', fontSize: 15, fontWeight: '800' },
  sessionSubtitle: { marginTop: 4, color: '#758079', fontSize: 11 },
  statusBadge: { borderRadius: 16, paddingHorizontal: 9, paddingVertical: 5 },
  openBadge: { backgroundColor: '#E2F5E9' },
  pendingBadge: { backgroundColor: '#FFF2D9' },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  openText: { color: '#16834B' },
  pendingText: { color: '#9A6800' },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13 },
  scheduleText: { color: '#626C66', fontSize: 11, fontWeight: '600' },
  sectionTitle: { marginTop: 2, marginBottom: -6, color: '#26352D', fontSize: 14, fontWeight: '800' },
  detailsCard: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#FFFFFF' },
  infoRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECE9' },
  infoLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  infoLabel: { color: '#69736D', fontSize: 11 },
  infoValue: { flex: 1, color: '#2A342E', fontSize: 11, fontWeight: '600', textAlign: 'right' },
  goodValue: { color: '#16834B' },
  warningValue: { color: '#A56A00' },
  badValue: { color: '#C2413A' },
  hintText: { marginHorizontal: 5, color: '#7B8580', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  bottomActions: { gap: 9, paddingHorizontal: 16, paddingTop: 10, backgroundColor: '#F5F7F6', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E3E9E5' },
  mapButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#A9D6BE', borderRadius: 10, backgroundColor: '#FFFFFF' },
  mapButtonText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  checkInButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 11, backgroundColor: COLORS.primary },
  checkInButtonDisabled: { backgroundColor: '#AAB8B0' },
  checkInButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
