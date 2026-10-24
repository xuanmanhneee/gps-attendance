import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import type { Role } from '@gps-attendance/shared';

import { useAuth } from '../../context/auth-context';
import { restoreDevMode, setDevMode } from '../../services/dev-mode';
import { colors } from '../../../theme';

const ROLE_LABELS: Record<Role, string> = {
  participant: 'Người tham gia',
  organizer: 'Người tổ chức',
  admin: 'Quản trị viên',
};

export default function Profile() {
  const { user, logout } = useAuth();
  const [devModeEnabled, setDevModeEnabled] = useState(false);

  const fullname = user?.fullname ?? 'Người dùng';
  const initial = fullname.trim().charAt(0).toUpperCase() || '?';
  const roleLabel = user ? ROLE_LABELS[user.role] : '—';

  // Khôi phục cờ dev mode đã lưu (mặc định tắt).
  useEffect(() => {
    void restoreDevMode().then(setDevModeEnabled);
  }, []);

  const handleToggleDevMode = (enabled: boolean) => {
    // Đổi UI trước cho mượt; nếu ghi storage lỗi thì lần mở app sau cờ về mặc định.
    setDevModeEnabled(enabled);
    void setDevMode(enabled).catch(() => {});
  };

  const handleSignOut = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất không?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch {
            // logout() đã xoá token/user cục bộ dù API lỗi, nên vẫn cho thoát
          }

          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Tài khoản</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {fullname}
          </Text>

          <Text style={styles.meta}>Mã số: {user?.code ?? '—'}</Text>

          <Text style={styles.meta}>Vai trò: {roleLabel}</Text>
        </View>
      </View>

      <View style={[styles.card, styles.devSection]}>
        <View style={styles.devRow}>
          <View style={styles.devRowInfo}>
            <Text style={styles.devTitle}>Chế độ dev</Text>

            <Text style={styles.devHint}>
              Hiện thêm công cụ dành cho lập trình viên
            </Text>
          </View>

          <Switch
            value={devModeEnabled}
            onValueChange={handleToggleDevMode}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {devModeEnabled && (
          <Pressable
            onPress={() => router.push('/dev')}
            style={({ pressed }) => [
              styles.devButton,
              pressed && styles.devButtonPressed,
            ]}
          >
            <Ionicons
              name="construct-outline"
              size={20}
              color={colors.primaryDark}
            />

            <Text style={styles.devButtonText}>Mở trang dev</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={handleSignOut}
        style={({ pressed }) => [
          styles.logout,
          pressed && styles.logoutPressed,
        ]}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />

        <Text style={styles.logoutText}>Đăng xuất</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 16,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  info: {
    flex: 1,
    gap: 4,
  },

  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },

  meta: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
  },

  logoutPressed: {
    opacity: 0.7,
  },

  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },

  // Kế thừa style `card` (nền, bo góc, đổ bóng), chỉ đổi sang layout dọc.
  devSection: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },

  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  devRowInfo: {
    flex: 1,
    gap: 4,
  },

  devTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },

  devHint: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  devButtonPressed: {
    opacity: 0.7,
  },

  devButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryDark,
  },
});

