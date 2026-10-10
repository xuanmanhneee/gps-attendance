import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Role } from '@gps-attendance/shared';

import { useAuth } from '../../context/auth-context';
import { colors } from '../../../theme';

const ROLE_LABELS: Record<Role, string> = {
  student: 'Sinh viên',
  lecturer: 'Giảng viên',
  admin: 'Quản trị viên',
};

export default function Profile() {
  const { user, logout } = useAuth();

  const fullname = user?.fullname ?? 'Người dùng';
  const initial = fullname.trim().charAt(0).toUpperCase() || '?';
  const roleLabel = user ? ROLE_LABELS[user.role] : '—';

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
});

