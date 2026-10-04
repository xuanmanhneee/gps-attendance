import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import type { AttendanceStatus } from '@gps-attendance/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiRequestError } from '../../api/api';
import { AttendanceAPI, type AttendanceHistoryItem } from '../../api/attendance.api';
import { DluLogo } from '../../components/dlu-logo';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../context/auth-context';

type StatusFilter = 'all' | AttendanceStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả trạng thái' },
  { key: 'present', label: 'Đã điểm danh' },
  { key: 'late', label: 'Đi muộn' },
  { key: 'absent', label: 'Vắng' },
  { key: 'excused', label: 'Nghỉ phép' },
];

function validDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string): string {
  const date = validDate(value);
  if (!date) return '--/--/----';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(value: string | null, fallback: string): string {
  const date = validDate(value ?? fallback);
  if (!date) return '--:--';
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function semesterForDate(value: string): { key: string; label: string; sort: number } {
  const date = validDate(value) ?? new Date();
  const semester = date.getMonth() < 6 ? 1 : 2;
  return {
    key: `${date.getFullYear()}-${semester}`,
    label: `Học kỳ ${semester} - ${date.getFullYear()}`,
    sort: date.getFullYear() * 10 + semester,
  };
}

function statusForRecord(record: AttendanceHistoryItem): {
  label: string;
  color: string;
  background: string;
} {
  if (record.sessionStatus === 'cancelled') {
    return { label: 'Đã hủy', color: '#69736D', background: '#EEF1EF' };
  }
  if (record.status === 'absent' && record.sessionStatus !== 'closed') {
    return { label: 'Chờ điểm danh', color: '#A56A00', background: '#FFF3D8' };
  }
  switch (record.status) {
    case 'present':
      return { label: 'Đã điểm danh', color: '#16834B', background: '#E4F5EA' };
    case 'late':
      return { label: 'Đi muộn', color: '#A56A00', background: '#FFF3D8' };
    case 'absent':
      return { label: 'Vắng', color: '#C2413A', background: '#FDEAE8' };
    case 'excused':
      return { label: 'Nghỉ phép', color: '#A56A00', background: '#FFF3D8' };
  }
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, logout } = useAuth();
  const [records, setRecords] = useState<AttendanceHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState(semesterForDate(new Date().toISOString()).key);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [semesterMenuVisible, setSemesterMenuVisible] = useState(false);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);

  const loadHistory = useCallback(async (refresh = false) => {
    if (!token) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await AttendanceAPI.getAttendanceHistory(token);
      if (!response.success) {
        throw new Error(response.message || 'Không thể tải lịch sử điểm danh.');
      }
      setRecords(Array.isArray(response.data) ? response.data : []);
      setLoadError(null);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        await logout();
        router.replace('/login');
      } else {
        setLoadError(error instanceof Error ? error.message : 'Không thể tải lịch sử điểm danh.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [logout, router, token]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const semesterOptions = useMemo(() => {
    const options = new Map<string, { key: string; label: string; sort: number }>();
    for (const record of records) {
      const semester = semesterForDate(record.openAt);
      options.set(semester.key, semester);
    }
    if (options.size === 0) {
      const current = semesterForDate(new Date().toISOString());
      options.set(current.key, current);
    }
    return [...options.values()].sort((left, right) => right.sort - left.sort);
  }, [records]);

  useEffect(() => {
    if (!semesterOptions.some((option) => option.key === selectedSemester)) {
      setSelectedSemester(semesterOptions[0]?.key ?? '');
    }
  }, [selectedSemester, semesterOptions]);

  const visibleRecords = useMemo(
    () =>
      records
        .filter((record) => semesterForDate(record.openAt).key === selectedSemester)
        .filter((record) => statusFilter === 'all' || record.status === statusFilter)
        .sort((left, right) => {
          const leftTime = validDate(left.openAt)?.getTime() ?? 0;
          const rightTime = validDate(right.openAt)?.getTime() ?? 0;
          return rightTime - leftTime;
        }),
    [records, selectedSemester, statusFilter],
  );

  const selectedSemesterLabel = semesterOptions.find((option) => option.key === selectedSemester)?.label
    ?? semesterOptions[0]?.label
    ?? 'Chọn học kỳ';
  const selectedStatusLabel = STATUS_FILTERS.find((filter) => filter.key === statusFilter)?.label ?? 'Lọc';

  const renderRecord = ({ item }: { item: AttendanceHistoryItem }) => {
    const status = statusForRecord(item);
    const time = formatTime(item.checkedInAt, item.openAt);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem chi tiết điểm danh ${item.sessionTitle}, ${formatDate(item.openAt)}, ${status.label}`}
        onPress={() => router.push({
          pathname: '/attendance/[id]',
          params: { id: String(item.sessionId) },
        })}
        style={({ pressed }) => [styles.recordRow, pressed && styles.recordRowPressed]}
      >
        <View style={styles.recordDateTime}>
          <Text style={styles.recordDate}>{formatDate(item.openAt)}</Text>
          <Text style={styles.recordTime}>{time}</Text>
        </View>
        <Text style={styles.recordSubject} numberOfLines={1}>{item.sessionTitle}</Text>
        <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
          <Text style={[styles.statusText, { color: status.color }]} numberOfLines={1}>{status.label}</Text>
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingScreen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải lịch sử điểm danh...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={21} color="#26352D" />
        </Pressable>
        <View style={styles.headerTitleGroup}>
          <DluLogo size={28} />
          <Text style={styles.headerTitle}>Lịch sử điểm danh</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Chọn học kỳ. Đang chọn ${selectedSemesterLabel}`}
          onPress={() => setSemesterMenuVisible(true)}
          style={styles.semesterButton}
        >
          <Text style={styles.semesterButtonText}>{selectedSemesterLabel}</Text>
          <MaterialCommunityIcons name="chevron-down" size={17} color="#738078" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Lọc trạng thái. ${selectedStatusLabel}`}
          onPress={() => setFilterMenuVisible(true)}
          style={[styles.filterButton, statusFilter !== 'all' && styles.filterButtonActive]}
        >
          <MaterialCommunityIcons name="filter-outline" size={19} color={statusFilter === 'all' ? '#536158' : COLORS.primary} />
        </Pressable>
      </View>

      {semesterMenuVisible && (
        <View style={styles.semesterMenu}>
          {semesterOptions.map((option) => (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              onPress={() => {
                setSelectedSemester(option.key);
                setSemesterMenuVisible(false);
              }}
              style={styles.semesterOption}
            >
              <Text style={[styles.semesterOptionText, option.key === selectedSemester && styles.semesterOptionSelected]}>
                {option.label}
              </Text>
              {option.key === selectedSemester && <MaterialCommunityIcons name="check" size={17} color={COLORS.primary} />}
            </Pressable>
          ))}
        </View>
      )}

      {loadError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable onPress={() => void loadHistory()}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={visibleRecords}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRecord}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 12) + 12 },
          visibleRecords.length === 0 && styles.emptyList,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadHistory(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={34} color="#A8B1AB" />
            <Text style={styles.emptyTitle}>Chưa có lịch sử điểm danh</Text>
            <Text style={styles.emptyDescription}>
              Không tìm thấy buổi học phù hợp với học kỳ và bộ lọc đã chọn.
            </Text>
          </View>
        }
      />

      <Modal
        visible={filterMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterMenuVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng bộ lọc"
            style={StyleSheet.absoluteFill}
            onPress={() => setFilterMenuVisible(false)}
          />
          <View style={[styles.filterSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Lọc trạng thái</Text>
            {STATUS_FILTERS.map((filter) => (
              <Pressable
                key={filter.key}
                accessibilityRole="button"
                onPress={() => {
                  setStatusFilter(filter.key);
                  setFilterMenuVisible(false);
                }}
                style={styles.filterOption}
              >
                <Text style={[styles.filterOptionText, statusFilter === filter.key && styles.semesterOptionSelected]}>
                  {filter.label}
                </Text>
                {statusFilter === filter.key && <MaterialCommunityIcons name="check" size={18} color={COLORS.primary} />}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  loadingText: { marginTop: 10, color: '#738078', fontSize: 13 },
  header: {
    minHeight: 52,
    paddingHorizontal: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8ECE9',
  },
  backButton: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { color: '#26352D', fontSize: 16, fontWeight: '800' },
  headerTitleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  headerSpacer: { width: 36 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, paddingVertical: 10 },
  semesterButton: {
    flex: 1,
    height: 37,
    paddingHorizontal: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E5EAE7',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  semesterButtonText: { color: '#34443A', fontSize: 12, fontWeight: '600' },
  filterButton: {
    width: 38,
    height: 37,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E5EAE7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  filterButtonActive: { borderColor: '#A8D5BA', backgroundColor: '#EFF8F2' },
  semesterMenu: {
    marginHorizontal: 14,
    marginBottom: 6,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7ECE9',
    shadowColor: '#183B2A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  semesterOption: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECE9' },
  semesterOptionText: { color: '#4E5B53', fontSize: 12 },
  semesterOptionSelected: { color: COLORS.primary, fontWeight: '700' },
  errorBanner: { marginHorizontal: 14, marginBottom: 8, padding: 10, borderRadius: 8, backgroundColor: '#FFF1EF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { flex: 1, color: '#A43A34', fontSize: 11 },
  retryText: { color: COLORS.primary, fontSize: 11, fontWeight: '700', marginLeft: 10 },
  listContent: { paddingHorizontal: 14, flexGrow: 1 },
  emptyList: { flexGrow: 1 },
  recordRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 5 },
  recordRowPressed: { opacity: 0.62 },
  recordDateTime: { width: 76 },
  recordDate: { color: '#34443A', fontSize: 9, fontWeight: '600' },
  recordTime: { marginTop: 2, color: '#68736D', fontSize: 9 },
  recordSubject: { flex: 1, color: '#29372F', fontSize: 10, fontWeight: '600' },
  statusBadge: { maxWidth: 83, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 4 },
  statusText: { fontSize: 8, fontWeight: '700', textAlign: 'center' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#E8ECE9' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 70 },
  emptyTitle: { marginTop: 12, color: '#34443A', fontSize: 14, fontWeight: '700' },
  emptyDescription: { marginTop: 6, color: '#7B8580', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 31, 24, 0.28)' },
  filterSheet: { paddingHorizontal: 18, paddingTop: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#FFFFFF' },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', backgroundColor: '#D6DDD8', marginBottom: 14 },
  sheetTitle: { marginBottom: 8, color: '#26352D', fontSize: 15, fontWeight: '800' },
  filterOption: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECE9' },
  filterOptionText: { color: '#4E5B53', fontSize: 12 },
});
