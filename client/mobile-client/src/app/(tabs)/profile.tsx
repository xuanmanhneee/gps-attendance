import React, { useCallback, useEffect, useState } from 'react';
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
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import type { StudentAttendanceSummary, UserProfileResponse } from '@gps-attendance/shared';

import { AttendanceAPI } from '../../api/attendance.api';
import { DluLogo } from '../../components/dlu-logo';
import { ConfirmDialog } from '../../components/confirm-dialog';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../context/auth-context';
import { userApi } from '../../api/user.api';
import { appAlert } from '../../utils/app-alert';

type PermissionState = 'granted' | 'denied' | 'disabled' | 'unknown';
type SettingsTarget = 'gps' | 'wifi' | 'bluetooth' | 'app';

function StatusRow({
  icon,
  label,
  value,
  statusColor,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
  statusColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. Chạm để xem hoặc thay đổi cài đặt.`}
      onPress={onPress}
      style={({ pressed }) => [styles.statusRow, pressed && styles.rowPressed]}
    >
      <MaterialCommunityIcons name={icon} size={17} color={statusColor} />
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, { color: statusColor }]}>{value}</Text>
    </Pressable>
  );
}

function DeviceRow({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; value: string }) {
  return (
    <View style={styles.deviceRow}>
      <View style={styles.deviceRowLabel}>
        <MaterialCommunityIcons name={icon} size={15} color="#7A8580" />
        <Text style={styles.deviceLabel}>{label}</Text>
      </View>
      <Text style={styles.deviceValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function StatisticCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={styles.statisticCard}>
      <Text style={[styles.statisticLabel, { color }]} numberOfLines={2}>{label}</Text>
      <Text style={[styles.statisticValue, { color }]}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<StudentAttendanceSummary | null>(null);
  const [gpsState, setGpsState] = useState<PermissionState>('unknown');
  const [wifiConnected, setWifiConnected] = useState<boolean | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [hasMockLocation, setHasMockLocation] = useState<boolean | null>(null);

  const refreshDeviceStatus = useCallback(async () => {
    try {
      const [permission, locationEnabled, network] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.hasServicesEnabledAsync(),
        Network.getNetworkStateAsync(),
      ]);
      setGpsState(!permission.granted ? 'denied' : locationEnabled ? 'granted' : 'disabled');
      setWifiConnected(network.type === Network.NetworkStateType.WIFI && network.isConnected === true);

      if (permission.granted && locationEnabled) {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setHasMockLocation(location.mocked ?? false);
        } catch {
          setHasMockLocation(null);
        }
      } else {
        setHasMockLocation(null);
      }
    } catch (error) {
      console.warn('Unable to read device permission state:', error);
      setGpsState('unknown');
      setWifiConnected(null);
      setHasMockLocation(null);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setProfile(await userApi.getProfile());
    } catch (error) {
      console.warn('Unable to load profile:', error);
      setProfile(null);
    }
  }, []);

  const loadAttendanceSummary = useCallback(async () => {
    if (!token) {
      setAttendanceSummary(null);
      return;
    }
    try {
      const response = await AttendanceAPI.getMySummary(token);
      if (response.success) setAttendanceSummary(response.data);
    } catch (error) {
      console.warn('Unable to load attendance summary:', error);
    }
  }, [token]);

  useEffect(() => {
    void loadProfile();
    void loadAttendanceSummary();
    void refreshDeviceStatus();

    const networkSubscription = Network.addNetworkStateListener((network) => {
      setWifiConnected(network.type === Network.NetworkStateType.WIFI && network.isConnected === true);
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshDeviceStatus();
    });

    return () => {
      networkSubscription.remove();
      appStateSubscription.remove();
    };
  }, [loadAttendanceSummary, loadProfile, refreshDeviceStatus]);

  const openSettings = async (target: SettingsTarget) => {
    try {
      if (target === 'app' && Platform.OS !== 'web') {
        await Linking.openSettings();
        return;
      }

      if (Platform.OS === 'android') {
        const action = target === 'gps'
          ? IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
          : target === 'wifi'
            ? IntentLauncher.ActivityAction.WIFI_SETTINGS
            : IntentLauncher.ActivityAction.BLUETOOTH_SETTINGS;
        await IntentLauncher.startActivityAsync(action);
        return;
      }

      appAlert(
        'Cần thay đổi cài đặt',
        target === 'gps'
          ? 'Mở Cài đặt > Quyền riêng tư & bảo mật > Dịch vụ định vị để bật vị trí.'
          : target === 'wifi'
            ? 'Mở Cài đặt > Wi‑Fi để bật hoặc kết nối mạng.'
            : 'Mở Cài đặt > Bluetooth để kiểm tra hoặc bật Bluetooth.',
      );
    } catch (error) {
      console.error('Unable to open device settings:', error);
      appAlert('Không mở được Cài đặt', 'Vui lòng mở Cài đặt thiết bị và thay đổi trạng thái tương ứng.');
    }
  };

  const handleGpsPress = async () => {
    if (gpsState === 'granted') {
      appAlert('GPS đã sẵn sàng', 'Ứng dụng đã được cấp quyền và dịch vụ vị trí đang bật.');
      return;
    }

    try {
      if (gpsState === 'denied') {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Cần quyền vị trí', 'Cho phép ứng dụng truy cập vị trí trong khi sử dụng.', [
            { text: 'Để sau', style: 'cancel' },
            { text: 'Mở cài đặt', onPress: () => void openSettings('app') },
          ]);
          return;
        }
      }

      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert('GPS đang tắt', 'Bật Dịch vụ vị trí để dùng điểm danh GPS.', [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Mở cài đặt', onPress: () => void openSettings('gps') },
        ]);
        return;
      }
      await refreshDeviceStatus();
    } catch (error) {
      console.error('Unable to request location permission:', error);
      await openSettings('app');
    }
  };

  const handleWifiPress = async () => {
    if (wifiConnected) {
      appAlert('Wi‑Fi đã kết nối', 'Thiết bị đang sử dụng mạng Wi‑Fi.');
      return;
    }
    if (Platform.OS === 'ios') {
      appAlert('Wi‑Fi chưa kết nối', 'Mở Cài đặt > Wi‑Fi để bật hoặc chọn mạng.');
      return;
    }
    Alert.alert('Wi‑Fi chưa kết nối', 'Bật Wi‑Fi hoặc chọn một mạng khả dụng.', [
      { text: 'Để sau', style: 'cancel' },
      { text: 'Mở cài đặt', onPress: () => void openSettings('wifi') },
    ]);
  };

  const handleBluetoothPress = () => {
    Alert.alert(
      'Trạng thái Bluetooth',
      'Ứng dụng hiện chưa có quyền/API để đọc trạng thái Bluetooth. Bạn có thể kiểm tra trực tiếp trong Cài đặt thiết bị.',
      [
        { text: 'Đóng', style: 'cancel' },
        { text: 'Mở cài đặt', onPress: () => void openSettings('bluetooth') },
      ],
    );
  };

  const handleSafetyPress = () => {
    if (!Device.isDevice) {
      appAlert('Thiết bị mô phỏng', 'Ứng dụng đang chạy trên simulator/emulator, chưa thể xác minh an toàn thiết bị.');
    } else if (hasMockLocation) {
      appAlert('Vị trí giả lập', 'Thiết bị đang báo vị trí giả lập. Hãy tắt ứng dụng giả vị trí trước khi điểm danh.');
    } else {
      appAlert(
        'Chưa xác minh bảo mật',
        'Ứng dụng chưa tích hợp Play Integrity (Android) hoặc App Attest (iOS), nên chưa thể khẳng định thiết bị an toàn.',
      );
    }
  };

  const handleLogout = () => setShowLogoutConfirm(true);

  const confirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      setShowLogoutConfirm(false);
      router.replace('/login');
    } catch {
      appAlert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const profileName = profile?.fullname ?? user?.name ?? 'Sinh viên';
  const profileCode = profile?.code ?? user?.code ?? 'Chưa cập nhật';
  const roleLabel = (profile?.role ?? user?.role) === 'student'
    ? 'Sinh viên'
    : (profile?.role ?? user?.role) === 'lecturer'
      ? 'Giảng viên'
      : 'Quản trị viên';
  const gpsLabel = gpsState === 'granted'
    ? 'Đã cấp'
    : gpsState === 'disabled'
      ? 'GPS đang tắt'
      : gpsState === 'denied'
        ? 'Chưa cấp'
        : 'Đang kiểm tra';
  const wifiLabel = wifiConnected === null
    ? 'Đang kiểm tra'
    : wifiConnected
      ? 'Đã kết nối'
      : 'Chưa kết nối';
  const deviceSafetyLabel = !Device.isDevice
    ? 'Thiết bị ảo'
    : hasMockLocation
      ? 'Không an toàn'
      : 'Chưa xác minh';
  const appVersion = Application.nativeApplicationVersion ?? '1.0.0';
  const green = '#16834B';
  const amber = '#A56A00';
  const red = '#C2413A';

  if (!user) {
    return (
      <View style={[styles.loadingScreen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 14) + 18 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleGroup}>
            <DluLogo size={34} />
            <Text style={styles.headerTitle}>Cài đặt</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Mở thông báo" onPress={() => router.push('/notifications')} style={styles.notificationButton}>
            <MaterialCommunityIcons name="bell-outline" size={20} color="#26352D" />
            <View style={styles.notificationDot} />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở thông tin cá nhân chi tiết"
          onPress={() => router.push('/profile/details')}
          style={({ pressed }) => [styles.profileCard, pressed && styles.rowPressed]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profileName.trim().charAt(0).toLocaleUpperCase()}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName} numberOfLines={1}>{profileName}</Text>
            <Text style={styles.profileMeta}>MSSV: {profileCode}</Text>
            <Text style={styles.profileMeta}>Vai trò: {roleLabel}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#87918B" />
        </Pressable>

        <View style={styles.statisticsRow}>
          <StatisticCard
            label="Tỷ lệ tham gia"
            value={attendanceSummary ? `${attendanceSummary.attendanceRate}%` : '—'}
            color="#16834B"
          />
          <StatisticCard
            label="Đã điểm danh"
            value={attendanceSummary ? attendanceSummary.presentCount + attendanceSummary.lateCount : '—'}
            color="#16834B"
          />
          <StatisticCard
            label="Vắng"
            value={attendanceSummary?.absentCount ?? '—'}
            color="#E5484D"
          />
          <StatisticCard
            label="Nghỉ phép"
            value={attendanceSummary?.excusedCount ?? '—'}
            color="#7255B8"
          />
        </View>

        <Text style={styles.sectionTitle}>Quyền truy cập</Text>
        <View style={styles.sectionCard}>
          <StatusRow
            icon="map-marker"
            label="Vị trí (GPS)"
            value={gpsLabel}
            statusColor={gpsState === 'granted' ? green : gpsState === 'unknown' ? amber : red}
            onPress={() => void handleGpsPress()}
          />
          <View style={styles.divider} />
          <StatusRow
            icon="wifi"
            label="Wi‑Fi"
            value={wifiLabel}
            statusColor={wifiConnected ? green : wifiConnected === null ? amber : red}
            onPress={() => void handleWifiPress()}
          />
          <View style={styles.divider} />
          <StatusRow
            icon="bluetooth"
            label="Bluetooth"
            value="Kiểm tra trong cài đặt"
            statusColor={amber}
            onPress={handleBluetoothPress}
          />
        </View>

        <Text style={styles.sectionTitle}>Thông tin thiết bị</Text>
        <View style={styles.sectionCard}>
          <DeviceRow icon="cellphone" label="Thiết bị" value={Device.modelName ?? 'Không xác định'} />
          <View style={styles.divider} />
          <DeviceRow icon="application-outline" label="Phiên bản app" value={appVersion} />
          <View style={styles.divider} />
          <Pressable accessibilityRole="button" onPress={handleSafetyPress} style={({ pressed }) => [styles.deviceRow, pressed && styles.rowPressed]}>
            <View style={styles.deviceRowLabel}>
              <MaterialCommunityIcons name="shield-check-outline" size={15} color="#7A8580" />
              <Text style={styles.deviceLabel}>Trạng thái thiết bị</Text>
            </View>
            <Text style={[styles.deviceValue, { color: hasMockLocation || !Device.isDevice ? red : amber }]}>
              {deviceSafetyLabel}
            </Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleLogout}
          disabled={isLoggingOut}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
        >
          {isLoggingOut ? <ActivityIndicator size="small" color="#C2413A" /> : null}
          <Text style={styles.logoutText}>{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</Text>
        </Pressable>
      </ScrollView>

      <ConfirmDialog
        visible={showLogoutConfirm}
        title="Xác nhận đăng xuất"
        message="Bạn có chắc muốn đăng xuất khỏi tài khoản này?"
        confirmText="Đăng xuất"
        cancelText="Hủy"
        loading={isLoggingOut}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F9F8' },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9F8' },
  content: { paddingHorizontal: 14, gap: 8 },
  header: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  headerTitle: { color: '#26352D', fontSize: 18, fontWeight: '800' },
  headerTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  notificationButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notificationDot: { position: 'absolute', top: 5, right: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5484D', borderWidth: 1, borderColor: '#FFFFFF' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EEEA', marginBottom: 6 },
  avatar: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DFF1E6', borderWidth: 2, borderColor: '#EAF7F0' },
  avatarText: { color: COLORS.primary, fontSize: 25, fontWeight: '800' },
  profileCopy: { flex: 1, gap: 3 },
  profileName: { color: '#26352D', fontSize: 14, fontWeight: '800' },
  profileMeta: { color: '#657169', fontSize: 10 },
  statisticsRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  statisticCard: { flex: 1, minHeight: 58, paddingHorizontal: 4, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#E8EEEA', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  statisticLabel: { minHeight: 20, fontSize: 7, lineHeight: 9, fontWeight: '700', textAlign: 'center' },
  statisticValue: { marginTop: 2, fontSize: 15, lineHeight: 18, fontWeight: '800' },
  sectionTitle: { marginTop: 7, marginBottom: 2, color: '#26352D', fontSize: 12, fontWeight: '800' },
  sectionCard: { paddingHorizontal: 11, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EEEA' },
  statusRow: { minHeight: 39, flexDirection: 'row', alignItems: 'center', gap: 9 },
  rowPressed: { opacity: 0.65 },
  statusLabel: { flex: 1, color: '#34443A', fontSize: 10, fontWeight: '600' },
  statusValue: { fontSize: 9, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E8ECE9' },
  deviceRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  deviceRowLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deviceLabel: { color: '#69736D', fontSize: 10 },
  deviceValue: { maxWidth: '54%', color: '#34443A', fontSize: 9, fontWeight: '600', textAlign: 'right' },
  logoutButton: { minHeight: 40, marginTop: 8, borderRadius: 9, borderWidth: 1, borderColor: '#F3B6B2', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  logoutPressed: { backgroundColor: '#FFF5F4' },
  logoutText: { color: '#C2413A', fontSize: 11, fontWeight: '800' },
});
