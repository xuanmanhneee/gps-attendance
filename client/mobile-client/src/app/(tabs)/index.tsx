import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import type { MyAttendanceSessionResponse } from '@gps-attendance/shared';

import { AttendanceAPI } from '../../api/attendance.api';
import { ApiRequestError } from '../../api/api';
import { DluLogo } from '../../components/dlu-logo';
import { Card } from '../../components/ui/card';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../context/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appAlert } from '../../utils/app-alert';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ngày chưa xác định';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function localDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getAttendanceStatus(session: MyAttendanceSessionResponse): {
  label: string;
  color: string;
  background: string;
} {
  if (session.status === 'cancelled') {
    return { label: 'Đã hủy', color: '#69736D', background: '#EEF1EF' };
  }

  switch (session.myAttendance.status) {
    case 'present':
      return { label: 'Đã điểm danh', color: '#16834B', background: '#E3F7EB' };
    case 'late':
      return { label: 'Đi muộn', color: '#A56A00', background: '#FFF4DB' };
    case 'excused':
      return { label: 'Có phép', color: '#6D55B5', background: '#F0EBFF' };
    case 'absent':
      if (session.status === 'open') {
        return { label: 'Đang mở', color: '#16834B', background: '#E3F7EB' };
      }
      if (session.status === 'pending') {
        return { label: 'Chưa mở', color: '#A56A00', background: '#FFF4DB' };
      }
      return { label: 'Vắng', color: '#C2413A', background: '#FDEAE8' };
  }
}

export default function AttendanceOverviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, logout } = useAuth();
  const [sessions, setSessions] = useState<MyAttendanceSessionResponse[]>([]);
  const [today, setToday] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const refreshToday = () => {
      const now = new Date();
      setToday((current) => localDateKey(current) === localDateKey(now) ? current : now);
    };
    const interval = setInterval(refreshToday, 60_000);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshToday();
    });

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, []);

  const loadSessions = useCallback(async (refresh = false) => {
    if (!token) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const response = await AttendanceAPI.getSessions(token);
      if (!response.success) {
        throw new Error(response.message || 'Không thể tải danh sách lớp');
      }
      setSessions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        await logout();
        router.replace('/login');
      } else {
        appAlert(
          'Lỗi tải danh sách',
          error instanceof Error ? error.message : 'Vui lòng thử lại.',
        );
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [logout, router, token]);

  useFocusEffect(
    useCallback(() => {
      void loadSessions();
    }, [loadSessions]),
  );

  const todayKey = localDateKey(today);
  const sessionsForToday = useMemo(
    () =>
      sessions
        .filter((session) => localDateKey(session.openAt) === todayKey)
        .sort((left, right) => new Date(left.openAt).getTime() - new Date(right.openAt).getTime()),
    [sessions, todayKey],
  );

  const openDetail = (sessionId: number) => {
    router.push({ pathname: '/attendance/[id]', params: { id: String(sessionId) } });
  };

  if (isLoading) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải phiên điểm danh hôm nay...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={sessionsForToday}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: Math.max(insets.top, 18), paddingBottom: 24 + insets.bottom },
          sessionsForToday.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadSessions(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <DluLogo size={48} containerStyle={{ marginRight: 12 }} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Điểm danh</Text>
              <Text style={styles.subtitle}>
                Hôm nay · {today.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{sessionsForToday.length}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const status = getAttendanceStatus(item);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Mở chi tiết điểm danh lớp ${item.title}`}
              onPress={() => openDetail(item.id)}
              style={({ pressed }) => [styles.sessionCard, pressed && styles.sessionCardPressed]}
            >
              <View style={styles.sessionIcon}>
                <MaterialCommunityIcons name="school-outline" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.sessionInfo}>
                <View style={styles.sessionTitleRow}>
                  <Text style={styles.sessionTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                <Text style={styles.sessionDate}>{formatDate(item.openAt)}</Text>
                <View style={styles.sessionMetaRow}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#737B85" />
                  <Text style={styles.sessionMetaText}>
                    {formatTime(item.openAt)} – {formatTime(item.closeAt)}
                  </Text>
                  <Text style={styles.metaSeparator}>·</Text>
                  <Text style={styles.sessionMetaText}>Bán kính {item.radius} m</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#8A929B" />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="check-all" size={30} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Hôm nay chưa có phiên điểm danh</Text>
            <Text style={styles.emptyText}>
              Các phiên trong ngày {today.toLocaleDateString('vi-VN')} sẽ hiển thị ở đây, dù bạn đã điểm danh hay chưa.
            </Text>
            <Pressable onPress={() => void loadSessions(true)} style={styles.retryButton}>
              <Text style={styles.retryText}>Làm mới</Text>
            </Pressable>
          </Card>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7F6' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F7F6' },
  loadingText: { marginTop: 12, color: '#626B73', fontSize: 14 },
  listContent: { flexGrow: 1, paddingHorizontal: 16, gap: 12 },
  emptyListContent: { justifyContent: 'flex-start' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: '800', color: '#173529' },
  subtitle: { marginTop: 3, fontSize: 13, color: '#68736D' },
  countBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2F4EA',
  },
  countText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E9EFEB',
    shadowColor: '#183B2A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionCardPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  sessionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7F0',
    marginRight: 12,
  },
  sessionInfo: { flex: 1, gap: 6 },
  sessionTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  sessionTitle: { flex: 1, color: '#1F2924', fontSize: 15, fontWeight: '700' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 9, fontWeight: '700' },
  sessionDate: { color: '#626B73', fontSize: 12, fontWeight: '600' },
  sessionMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sessionMetaText: { color: '#737B85', fontSize: 11 },
  metaSeparator: { color: '#A0A6AD', fontSize: 12 },
  emptyCard: { marginTop: 20, alignItems: 'center', paddingVertical: 28, paddingHorizontal: 22 },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { color: '#1F2924', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyText: { marginTop: 7, color: '#717A74', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retryButton: { marginTop: 18, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10, backgroundColor: '#EAF7F0' },
  retryText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
});
