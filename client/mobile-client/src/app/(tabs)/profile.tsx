import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/auth-context';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { COLORS } from '../../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn đăng xuất?', [
      {
        text: 'Hủy',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'Đăng Xuất',
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await logout();
            router.replace('/login');
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể đăng xuất');
          } finally {
            setIsLoggingOut(false);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  if (!user) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.errorText}>Không thể tải thông tin người dùng</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: Math.max(insets.top, 20) + 16,
          paddingBottom: Math.max(insets.bottom, 20) + 24,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.centerWrapper}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Thông Tin Cá Nhân</Text>
        </View>

      {/* Profile Info Card */}
      <Card style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userCode}>{user.code}</Text>
        <View style={styles.roleContainer}>
          <Text style={styles.roleLabel}>
            {user.role === 'student'
              ? '🎓 Sinh viên'
              : user.role === 'lecturer'
                ? '👨‍🏫 Giảng viên'
                : '👨‍💼 Quản trị viên'}
          </Text>
        </View>
      </Card>

      {/* User Details */}
      <Card style={styles.detailCard}>
        <Text style={styles.sectionTitle}>Thông Tin Tài Khoản</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Tên:</Text>
          <Text style={styles.detailValue}>{user.name}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Mã số:</Text>
          <Text style={styles.detailValue}>{user.code}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Vai trò:</Text>
          <Text style={styles.detailValue}>
            {user.role === 'student'
              ? 'Sinh viên'
              : user.role === 'lecturer'
                ? 'Giảng viên'
                : 'Quản trị viên'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>ID tài khoản:</Text>
          <Text style={styles.detailValue}>{user.id}</Text>
        </View>
      </Card>

      {/* Settings Section */}
      <Card style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>Cài Đặt</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Phiên bản ứng dụng</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Chế độ Dark Mode</Text>
          <Text style={styles.settingValue}>Tự động</Text>
        </View>
      </Card>

      {/* Logout Button */}
      <View style={styles.buttonContainer}>
        <Button
          title={isLoggingOut ? 'Đang đăng xuất...' : 'Đăng Xuất'}
          onPress={handleLogout}
          disabled={isLoggingOut}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>GPS Attendance System v1.0.0</Text>
      </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  userCode: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  roleContainer: {
    marginTop: 8,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  detailCard: {
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  settingsCard: {
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 20,
  },
});
