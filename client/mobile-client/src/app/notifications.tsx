import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type {
  AttendanceHistoryEventDto,
  MyAttendanceSessionResponse,
} from '@gps-attendance/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AttendanceAPI } from '../api/attendance.api';
import { ApiRequestError } from '../api/api';
import { DluLogo } from '../components/dlu-logo';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/auth-context';

type NotificationFilter = 'all' | 'unread' | 'read';
type NotificationIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface AppNotification {
  id: string;
  sessionId: number;
  subject: string;
  title: string;
  message: string;
  createdAt: string;
  icon: NotificationIcon;
  color: string;
  backgroundColor: string;
}

const READ_IDS_PREFIX = 'attendance-notification-read:';

function formatNotificationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isToday) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function mapHistoryEvent(event: AttendanceHistoryEventDto): AppNotification {
  if (event.eventType === 'SESSION_ASSIGNED') {
    return {
      id: `event-${event.id}`,
      sessionId: event.sessionId,
      subject: event.sessionTitle,
      title: 'Phiên điểm danh mới',
      message: `Bạn đã được phân vào lớp ${event.sessionTitle}.`,
      createdAt: event.createdAt,
      icon: 'lock-outline',
      color: '#2778D4',
      backgroundColor: '#EAF3FF',
    };
  }

  if (event.eventType === 'REVIEW_DECISION') {
    const approved = event.attemptResult === 'APPROVED';
    return {
      id: `event-${event.id}`,
      sessionId: event.sessionId,
      subject: event.sessionTitle,
      title: approved ? 'Điểm danh được duyệt' : 'Kết quả điểm danh đã cập nhật',
      message: approved
        ? `Lượt điểm danh môn ${event.sessionTitle} đã được duyệt.`
        : `Lượt điểm danh môn ${event.sessionTitle} không được chấp thuận.${event.note ? ` ${event.note}` : ''}`,
      createdAt: event.createdAt,
      icon: approved ? 'check-decagram' : 'close-circle',
      color: approved ? '#16834B' : '#C2413A',
      backgroundColor: approved ? '#E7F6EC' : '#FDEAE8',
    };
  }

  if (event.eventType === 'CHECK_IN_ATTEMPT') {
    const approved = event.attemptResult === 'APPROVED';
    const review = event.attemptResult === 'REVIEW';
    return {
      id: `event-${event.id}`,
      sessionId: event.sessionId,
      subject: event.sessionTitle,
      title: approved ? 'Điểm danh thành công' : review ? 'Điểm danh đang được xem xét' : 'Điểm danh chưa thành công',
      message: approved
        ? `Bạn đã điểm danh môn ${event.sessionTitle}.`
        : review
          ? `Lượt điểm danh môn ${event.sessionTitle} đang chờ giảng viên xác nhận.`
          : `Vui lòng kiểm tra lại lượt điểm danh môn ${event.sessionTitle}.`,
      createdAt: event.createdAt,
      icon: approved ? 'check-decagram' : review ? 'clipboard-clock-outline' : 'alert-circle-outline',
      color: approved ? '#16834B' : review ? '#A56A00' : '#C2413A',
      backgroundColor: approved ? '#E7F6EC' : review ? '#FFF3D8' : '#FDEAE8',
    };
  }

  return {
    id: `event-${event.id}`,
    sessionId: event.sessionId,
    subject: event.sessionTitle,
    title: 'Trạng thái điểm danh đã cập nhật',
    message: event.status
      ? `Trạng thái môn ${event.sessionTitle} đã cập nhật: ${event.status}.`
      : `Thông tin điểm danh môn ${event.sessionTitle} đã được cập nhật.`,
    createdAt: event.createdAt,
    icon: 'bell-check-outline',
    color: '#16834B',
    backgroundColor: '#E7F6EC',
  };
}

function mapSessionReminder(session: MyAttendanceSessionResponse): AppNotification {
  const isOpen = session.status === 'open';
  return {
    id: `session-${session.id}-${session.status}`,
    sessionId: session.id,
    subject: session.title,
    title: isOpen ? 'Phiên điểm danh đã mở' : 'Nhắc nhở điểm danh',
    message: isOpen
      ? `Bạn có thể điểm danh môn ${session.title} ngay bây giờ.`
      : `Đừng quên điểm danh môn ${session.title} lúc ${new Date(session.openAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}.`,
    createdAt: isOpen ? new Date().toISOString() : session.openAt,
    icon: isOpen ? 'door-open' : 'alarm',
    color: isOpen ? '#16834B' : '#D97706',
    backgroundColor: isOpen ? '#E7F6EC' : '#FFF3E2',
  };
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, user, logout } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<NotificationFilter>('unread');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const storageKey = `${READ_IDS_PREFIX}${user?.id ?? 'current'}`;

  const loadNotifications = useCallback(async (refresh = false) => {
    if (!token) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const [eventsResponse, sessionsResponse, storedReadIds] = await Promise.all([
        AttendanceAPI.getAttendanceHistoryEvents(token),
        AttendanceAPI.getSessions(token),
        AsyncStorage.getItem(storageKey),
      ]);

      if (!eventsResponse.success) throw new Error(eventsResponse.message || 'Không tải được nhật ký thông báo.');
      if (!sessionsResponse.success) throw new Error(sessionsResponse.message || 'Không tải được lịch điểm danh.');

      const events = Array.isArray(eventsResponse.data) ? eventsResponse.data : [];
      const sessions = Array.isArray(sessionsResponse.data) ? sessionsResponse.data : [];
      const eventNotifications = events.map(mapHistoryEvent);
      const sessionNotifications = sessions
        .filter((session) =>
          (session.status === 'open' || session.status === 'pending') &&
          session.myAttendance.status === 'absent' &&
          !session.myAttendance.checkedInAt,
        )
        .map(mapSessionReminder);
      const byId = new Map<string, AppNotification>();
      [...eventNotifications, ...sessionNotifications].forEach((notification) => {
        byId.set(notification.id, notification);
      });
      setNotifications(
        [...byId.values()].sort((left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        ),
      );
      setReadIds(new Set(storedReadIds ? JSON.parse(storedReadIds) as string[] : []));
      setLoadError(null);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        await logout();
        router.replace('/login');
      } else {
        setLoadError(error instanceof Error ? error.message : 'Không tải được thông báo.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [logout, router, storageKey, token]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter((notification) => !readIds.has(notification.id)).length;
  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => {
      const isRead = readIds.has(notification.id);
      return filter === 'all' || (filter === 'read' ? isRead : !isRead);
    }),
    [filter, notifications, readIds],
  );

  const persistReadIds = async (ids: Set<string>) => {
    setReadIds(ids);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify([...ids]));
    } catch (error) {
      console.warn('Unable to persist notification read state:', error);
    }
  };

  const markAllRead = async () => {
    await persistReadIds(new Set(notifications.map((notification) => notification.id)));
  };

  const openNotification = async (notification: AppNotification) => {
    if (!readIds.has(notification.id)) {
      const nextReadIds = new Set(readIds);
      nextReadIds.add(notification.id);
      await persistReadIds(nextReadIds);
    }
    router.push({ pathname: '/attendance/[id]', params: { id: String(notification.sessionId) } });
  };

  const filterTabs: { key: NotificationFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'unread', label: `Chưa đọc (${unreadCount})` },
    { key: 'read', label: 'Đã đọc' },
  ];

  if (isLoading) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải thông báo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={21} color="#26352D" />
        </Pressable>
        <View style={styles.headerTitleGroup}>
          <DluLogo size={28} />
          <Text style={styles.headerTitle}>Thông báo</Text>
        </View>
        <View style={styles.bellBadge}>
          <MaterialCommunityIcons name="bell-outline" size={20} color="#26352D" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.filterTabs}>
        {filterTabs.map((tab) => (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === tab.key }}
            onPress={() => setFilter(tab.key)}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
          >
            <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {loadError && (
        <Pressable onPress={() => void loadNotifications(true)} style={styles.errorBanner}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
      )}

      <FlatList
        data={visibleNotifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 12) + 16 },
          visibleNotifications.length === 0 && styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadNotifications(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        renderItem={({ item }) => {
          const isRead = readIds.has(item.id);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.message}. ${isRead ? 'Đã đọc' : 'Chưa đọc'}`}
              onPress={() => void openNotification(item)}
              style={({ pressed }) => [styles.notificationRow, !isRead && styles.notificationUnread, pressed && styles.rowPressed]}
            >
              <View style={[styles.notificationIcon, { backgroundColor: item.backgroundColor }]}>
                <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={styles.notificationCopy}>
                <Text style={styles.notificationTitle} numberOfLines={1}>{item.title} ({item.subject})</Text>
                <Text style={styles.notificationMessage} numberOfLines={2}>{item.message}</Text>
              </View>
              <View style={styles.notificationMeta}>
                <Text style={styles.notificationTime}>{formatNotificationTime(item.createdAt)}</Text>
                {!isRead && <View style={styles.unreadDot} />}
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="bell-check-outline" size={36} color="#A8B1AB" />
            <Text style={styles.emptyTitle}>{filter === 'unread' ? 'Bạn đã đọc hết thông báo' : 'Chưa có thông báo'}</Text>
            <Text style={styles.emptyMessage}>Thông báo mới về các phiên và kết quả điểm danh sẽ hiển thị tại đây.</Text>
          </View>
        }
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => void markAllRead()}
        disabled={unreadCount === 0}
        style={({ pressed }) => [styles.markAllButton, unreadCount === 0 && styles.markAllDisabled, pressed && unreadCount > 0 && styles.rowPressed, { marginBottom: Math.max(insets.bottom, 8) }]}
      >
        <MaterialCommunityIcons name="check-all" size={17} color={unreadCount === 0 ? '#9AA39D' : COLORS.primary} />
        <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>Đánh dấu tất cả đã đọc</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  loadingText: { marginTop: 10, color: '#738078', fontSize: 12 },
  header: { minHeight: 48, paddingHorizontal: 13, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECE9' },
  backButton: { width: 34, height: 34, justifyContent: 'center' },
  headerTitle: { color: '#26352D', fontSize: 16, fontWeight: '800' },
  headerTitleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  bellBadge: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 15, height: 15, paddingHorizontal: 3, borderRadius: 8, backgroundColor: '#E5484D', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
  filterTabs: { paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', gap: 7 },
  filterTab: { flex: 1, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#E6EBE8', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  filterTabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  filterTabText: { color: '#59665E', fontSize: 9, fontWeight: '700' },
  filterTabTextActive: { color: '#FFFFFF' },
  listContent: { flexGrow: 1, paddingHorizontal: 12 },
  emptyList: { justifyContent: 'center' },
  notificationRow: { minHeight: 66, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 9 },
  notificationUnread: { backgroundColor: '#FCFDFC' },
  rowPressed: { opacity: 0.64 },
  notificationIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  notificationCopy: { flex: 1, gap: 3 },
  notificationTitle: { color: '#29372F', fontSize: 10, fontWeight: '800' },
  notificationMessage: { color: '#69736D', fontSize: 9, lineHeight: 13 },
  notificationMeta: { width: 48, alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 3 },
  notificationTime: { color: '#738078', fontSize: 8 },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#E9EEEB' },
  errorBanner: { marginHorizontal: 12, marginBottom: 7, padding: 9, borderRadius: 8, backgroundColor: '#FFF1EF', flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  errorText: { flex: 1, color: '#A43A34', fontSize: 10 },
  retryText: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  emptyTitle: { marginTop: 12, color: '#34443A', fontSize: 13, fontWeight: '700' },
  emptyMessage: { marginTop: 5, color: '#7B8580', fontSize: 10, lineHeight: 15, textAlign: 'center' },
  markAllButton: { minHeight: 42, marginHorizontal: 12, marginTop: 5, borderRadius: 9, borderWidth: 1, borderColor: '#A8D5BA', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#FFFFFF' },
  markAllDisabled: { borderColor: '#E5EAE7', backgroundColor: '#F8FAF9' },
  markAllText: { color: COLORS.primary, fontSize: 10, fontWeight: '800' },
  markAllTextDisabled: { color: '#9AA39D' },
});
