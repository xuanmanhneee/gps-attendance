import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import type { MyAttendanceSessionResponse } from '@gps-attendance/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiRequestError } from '../../api/api';
import { AttendanceAPI } from '../../api/attendance.api';
import { DluLogo } from '../../components/dlu-logo';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../context/auth-context';

const CAMPUS_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function startOfWeek(date: Date): Date {
  const result = new Date(`${dateKey(date)}T00:00:00Z`);
  const dayFromMonday = (result.getUTCDay() + 6) % 7;
  result.setUTCDate(result.getUTCDate() - dayFromMonday);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function dateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAMPUS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function formatDay(date: Date): string {
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatClock(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('vi-VN', {
    timeZone: CAMPUS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getIsoWeek(date: Date): number {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function weekLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  return `Tuần ${getIsoWeek(weekStart)} (${formatDay(weekStart)} – ${formatDay(weekEnd)}/${weekEnd.getUTCFullYear()})`;
}

function getDayLabel(date: Date): string {
  const day = date.getUTCDay();
  return day === 0 ? 'CN' : `T${day + 1}`;
}

function getStatus(session: MyAttendanceSessionResponse): { label: string; color: string; background: string } {
  if (session.status === 'cancelled') return { label: 'Đã hủy', color: '#6B756F', background: '#EEF1EF' };
  if (session.myAttendance.status === 'present') return { label: 'Đã điểm danh', color: '#16834B', background: '#E4F5EA' };
  if (session.myAttendance.status === 'late') return { label: 'Đi muộn', color: '#A56A00', background: '#FFF3D8' };
  if (session.myAttendance.status === 'excused') return { label: 'Có phép', color: '#6D55B5', background: '#F0EBFF' };
  if (session.status === 'open') return { label: 'Đang mở', color: '#16834B', background: '#E4F5EA' };
  if (session.status === 'pending') return { label: 'Chưa mở', color: '#A56A00', background: '#FFF3D8' };
  return { label: 'Đã kết thúc', color: '#6B756F', background: '#EEF1EF' };
}

export default function ScheduleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, logout } = useAuth();
  const [sessions, setSessions] = useState<MyAttendanceSessionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
  const [weekMenuVisible, setWeekMenuVisible] = useState(false);

  const loadSessions = useCallback(async (refresh = false) => {
    if (!token) {
      setSessions([]);
      setIsLoading(false);
      return;
    }
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await AttendanceAPI.getSessions(token);
      if (!response.success) throw new Error(response.message || 'Không thể tải lịch học.');
      setSessions(Array.isArray(response.data) ? response.data : []);
      setLoadError(null);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        await logout();
        router.replace('/login');
      } else {
        setLoadError(error instanceof Error ? error.message : 'Không thể tải lịch học.');
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

  const weekOptions = useMemo(() => {
    const unique = new Map<string, Date>();
    const current = startOfWeek(new Date());
    unique.set(dateKey(current), current);
    sessions.forEach((session) => {
      const openAt = new Date(session.openAt);
      if (!Number.isNaN(openAt.getTime())) {
        const start = startOfWeek(openAt);
        unique.set(dateKey(start), start);
      }
    });
    return [...unique.values()].sort((left, right) => right.getTime() - left.getTime());
  }, [sessions]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const selectedDaySessions = useMemo(
    () => sessions
      .filter((session) => dateKey(new Date(session.openAt)) === selectedDay)
      .sort((left, right) => new Date(left.openAt).getTime() - new Date(right.openAt).getTime()),
    [selectedDay, sessions],
  );

  const openSessionDetail = (sessionId: number) => {
    router.push({ pathname: '/attendance/[id]', params: { id: String(sessionId) } });
  };

  const selectWeek = (date: Date) => {
    const nextWeek = startOfWeek(date);
    setWeekStart(nextWeek);
    const today = new Date();
    setSelectedDay(
      dateKey(today) >= dateKey(nextWeek) && dateKey(today) <= dateKey(addDays(nextWeek, 6))
        ? dateKey(today)
        : dateKey(nextWeek),
    );
    setWeekMenuVisible(false);
  };

  const bellPress = () => router.push('/notifications');

  if (isLoading) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải lịch học...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.headerTitleGroup}>
          <DluLogo size={34} />
          <Text style={styles.title}>Lịch học</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Thông báo" onPress={bellPress} style={styles.bellButton}>
          <MaterialCommunityIcons name="bell-outline" size={20} color="#26352D" />
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={() => setWeekMenuVisible(true)} style={styles.weekButton}>
        <Text style={styles.weekButtonText}>{weekLabel(weekStart)}</Text>
        <MaterialCommunityIcons name="chevron-down" size={17} color="#758078" />
      </Pressable>

      <View style={styles.dayStrip}>
        {weekDays.map((date) => {
          const key = dateKey(date);
          const selected = key === selectedDay;
          const hasClass = sessions.some((session) => dateKey(new Date(session.openAt)) === key);
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setSelectedDay(key)}
              style={[styles.dayButton, selected && styles.dayButtonSelected]}
            >
              <Text style={[styles.dayName, selected && styles.dayTextSelected]}>{getDayLabel(date)}</Text>
              <Text style={[styles.dayNumber, selected && styles.dayTextSelected]}>{date.getDate()}</Text>
              {hasClass && <View style={[styles.dayDot, selected && styles.dayDotSelected]} />}
            </Pressable>
          );
        })}
      </View>

      {loadError && (
        <Pressable style={styles.errorBanner} onPress={() => void loadSessions(true)}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
      )}

      <FlatList
        data={selectedDaySessions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 12) + 16 },
          selectedDaySessions.length === 0 && styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadSessions(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        renderItem={({ item }) => {
          const status = getStatus(item);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Mở chi tiết ${item.title}, ${formatClock(item.openAt)}`}
              onPress={() => openSessionDetail(item.id)}
              style={({ pressed }) => [styles.classCard, pressed && styles.classCardPressed]}
            >
              <View style={styles.timeColumn}>
                <Text style={styles.startTime}>{formatClock(item.openAt)}</Text>
                <Text style={styles.endTime}>{formatClock(item.closeAt)}</Text>
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.classTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.classMeta} numberOfLines={1}>
                  {item.radius} m · {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                </Text>
                <Text style={styles.classMeta}>Phiên #{item.id}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={36} color="#A8B1AB" />
            <Text style={styles.emptyTitle}>Không có lịch học</Text>
            <Text style={styles.emptyText}>Không có phiên học nào trong ngày {formatDayLabel(selectedDay)}.</Text>
          </View>
        }
      />

      <Modal visible={weekMenuVisible} transparent animationType="fade" onRequestClose={() => setWeekMenuVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setWeekMenuVisible(false)} />
          <View style={[styles.weekSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Chọn tuần</Text>
            {weekOptions.map((option) => (
              <Pressable key={dateKey(option)} onPress={() => selectWeek(option)} style={styles.weekOption}>
                <Text style={[styles.weekOptionText, dateKey(option) === dateKey(weekStart) && styles.weekOptionSelected]}>
                  {weekLabel(option)}
                </Text>
                {dateKey(option) === dateKey(weekStart) && <MaterialCommunityIcons name="check" size={17} color={COLORS.primary} />}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatDayLabel(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return date.toLocaleDateString('vi-VN', {
    timeZone: CAMPUS_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  loadingText: { marginTop: 10, color: '#738078', fontSize: 12 },
  header: { minHeight: 44, paddingHorizontal: 14, paddingBottom: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { color: '#26352D', fontSize: 17, fontWeight: '800' },
  bellButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellDot: { position: 'absolute', top: 4, right: 3, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5484D', borderWidth: 1, borderColor: '#FFFFFF' },
  weekButton: { height: 34, marginHorizontal: 13, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E5EAE7', borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekButtonText: { color: '#34443A', fontSize: 10, fontWeight: '600' },
  dayStrip: { paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  dayButton: { flex: 1, minHeight: 42, borderRadius: 9, borderWidth: 1, borderColor: '#E6EBE8', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', gap: 2 },
  dayButtonSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayName: { color: '#647068', fontSize: 8, fontWeight: '700' },
  dayNumber: { color: '#26352D', fontSize: 10, fontWeight: '800' },
  dayTextSelected: { color: '#FFFFFF' },
  dayDot: { position: 'absolute', bottom: 3, width: 3, height: 3, borderRadius: 2, backgroundColor: COLORS.primary },
  dayDotSelected: { backgroundColor: '#FFFFFF' },
  listContent: { flexGrow: 1, paddingHorizontal: 12, paddingTop: 3 },
  emptyList: { justifyContent: 'center' },
  classCard: { minHeight: 69, paddingVertical: 10, paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: '#FFFFFF' },
  classCardPressed: { opacity: 0.65 },
  timeColumn: { width: 43, alignSelf: 'stretch', justifyContent: 'center', gap: 4 },
  startTime: { color: '#26352D', fontSize: 9, fontWeight: '800' },
  endTime: { color: '#77827A', fontSize: 8 },
  classInfo: { flex: 1, gap: 3 },
  classTitle: { color: '#26352D', fontSize: 9, fontWeight: '800' },
  classMeta: { color: '#748078', fontSize: 8 },
  statusBadge: { maxWidth: 70, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 8, fontWeight: '700', textAlign: 'center' },
  separator: { height: 1, backgroundColor: '#EDF0EE' },
  emptyState: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 50 },
  emptyTitle: { marginTop: 10, color: '#34443A', fontSize: 13, fontWeight: '700' },
  emptyText: { marginTop: 5, color: '#7B8580', fontSize: 10, lineHeight: 15, textAlign: 'center' },
  errorBanner: { marginHorizontal: 12, marginBottom: 6, padding: 9, borderRadius: 8, backgroundColor: '#FFF1EF', flexDirection: 'row', justifyContent: 'space-between' },
  errorText: { flex: 1, color: '#A43A34', fontSize: 10 },
  retryText: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 31, 24, 0.28)' },
  weekSheet: { paddingHorizontal: 18, paddingTop: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#FFFFFF' },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', backgroundColor: '#D6DDD8', marginBottom: 14 },
  sheetTitle: { marginBottom: 8, color: '#26352D', fontSize: 15, fontWeight: '800' },
  weekOption: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECE9' },
  weekOptionText: { color: '#4E5B53', fontSize: 11 },
  weekOptionSelected: { color: COLORS.primary, fontWeight: '700' },
});
