import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type {
  AttendanceCheckInReason,
  AttendanceStatus,
  MyAttendanceSessionResponse,
  SessionStatus,
} from '@gps-attendance/shared';

import { attendanceSessionsApi } from '../../api/attendance-sessions.api';
import { useNow } from '../../hooks/use-now';
import { checkIn } from '../../services/attendance';
import { LocationPermissionError } from '../../services/location';
import { colors } from '../../../theme';

// Trạng thái phiên nhìn từ phía sinh viên. Dẫn xuất từ type của shared (không
// chép tay) để khi server thêm SessionStatus mới thì switch dưới đây hết
// exhaustive và TS báo lỗi ngay, thay vì âm thầm rơi vào nhánh sai.
// 'open' không nằm trong union: phiên đang mở thì trạng thái hiển thị chính là
// `myAttendance.status`.
type StudentSessionStatus = Exclude<SessionStatus, 'open'> | AttendanceStatus;

function getStudentSessionStatus(
  session: MyAttendanceSessionResponse,
): StudentSessionStatus {
  // 'cancelled' là stored state do giảng viên set, phải kiểm tra TRƯỚC khi
  // xét theo giờ/điểm danh — nếu không sẽ bị tính đè thành 'absent' và hiện
  // như thể sinh viên còn điểm danh được.
  if (session.status === 'cancelled') {
    return 'cancelled';
  }

  if (session.status === 'pending') {
    return 'pending';
  }

  if (session.status === 'closed') {
    return 'closed';
  }

  return session.myAttendance.status;
}

function getStudentSessionStatusLabel(status: StudentSessionStatus): string {
  switch (status) {
    case 'pending':
      return 'Chưa mở';

    case 'absent':
      return 'Chưa điểm danh';

    case 'present':
      return 'Đã điểm danh';

    case 'late':
      return 'Đi trễ';

    case 'excused':
      return 'Có phép';

    case 'closed':
      return 'Đã kết thúc';

    case 'cancelled':
      return 'Đã huỷ';
  }
}

function getCheckInButtonLabel(status: StudentSessionStatus): string {
  switch (status) {
    case 'absent':
      return 'Điểm danh ngay';

    case 'pending':
      return 'Chưa mở';

    case 'closed':
      return 'Đã kết thúc';

    case 'cancelled':
      return 'Đã huỷ';

    case 'present':
    case 'late':
    case 'excused':
      return 'Đã điểm danh';
  }
}

function getCheckInFailureMessage(reasons: AttendanceCheckInReason[]): string {
  return reasons
    .map((reason) => {
      switch (reason) {
        case 'OUT_OF_RANGE':
          return 'Bạn đang ở ngoài phạm vi điểm danh.';

        case 'MOCK_LOCATION':
          return 'Vị trí hiện tại có dấu hiệu là vị trí giả.';

        case 'LOW_CONFIDENCE_SCORE':
          return 'Độ tin cậy của vị trí quá thấp.';

        case 'TOO_MANY_ATTEMPTS':
          return 'Bạn đã thử điểm danh quá nhiều lần.';

        case 'DUPLICATE_DEVICE':
          return 'Thiết bị này đã được sử dụng để điểm danh.';
      }
    })
    .join('\n');
}

function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusStyle(status: StudentSessionStatus) {
  switch (status) {
    case 'present':
      return {
        container: styles.statusPresent,
        text: styles.statusPresentText,
      };

    case 'late':
      return {
        container: styles.statusPending,
        text: styles.statusPendingText,
      };

    case 'excused':
      return {
        container: styles.statusAbsent,
        text: styles.statusAbsentText,
      };

    case 'absent':
      return {
        container: styles.statusAbsent,
        text: styles.statusAbsentText,
      };

    case 'pending':
      return {
        container: styles.statusPending,
        text: styles.statusPendingText,
      };

    case 'closed':
      return {
        container: styles.statusClosed,
        text: styles.statusClosedText,
      };

    case 'cancelled':
      return {
        container: styles.statusClosed,
        text: styles.statusClosedText,
      };
  }
}

export default function HomeScreen() {
  const [sessions, setSessions] = useState<MyAttendanceSessionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingInId, setCheckingInId] = useState<number | null>(null);

  // Mốc thời gian của các phiên: useNow re-render đúng lúc đồng hồ đi qua
  // openAt/closeAt (và khi app trở lại foreground).
  const boundaries = useMemo(
    () => sessions.flatMap((session) => [session.openAt, session.closeAt]),
    [sessions],
  );
  const now = useNow(boundaries);
  const syncedAtRef = useRef(now);

  const fetchSessions = useCallback(async () => {
    setSessions(await attendanceSessionsApi.getSessions());
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      await fetchSessions();
    } catch {
      Alert.alert('Lỗi', 'Không tải được danh sách phiên điểm danh');
    }
  }, [fetchSessions]);

  useEffect(() => {
    loadSessions().finally(() => {
      setLoading(false);
    });
  }, [loadSessions]);

  // Trạng thái phiên (pending/open/closed) do server tính theo giờ của server,
  // nên khi qua mốc openAt/closeAt phải hỏi lại server — không tự tính ở client
  // để tránh lệch giờ máy và lặp lại đúng loại logic đã gây bug 'cancelled'.
  useEffect(() => {
    if (syncedAtRef.current === now) {
      return;
    }

    syncedAtRef.current = now;

    // Đồng bộ nền: lỗi mạng ở đây không alert vì người dùng không chủ động gọi.
    void fetchSessions().catch(() => {});
  }, [now, fetchSessions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadSessions();
    } finally {
      setRefreshing(false);
    }
  }, [loadSessions]);

  const handleCheckIn = useCallback(
    async (sessionId: number) => {
      if (checkingInId !== null) {
        return;
      }

      setCheckingInId(sessionId);

      try {
        // Payload thật: GPS + device + integrity lấy trong services/attendance.
        const result = await checkIn(sessionId);

        if (result.status === 'VALID') {
          setSessions((current) =>
            current.map((session) => {
              if (session.id !== sessionId) {
                return session;
              }

              return {
                ...session,
                myAttendance: {
                  ...session.myAttendance,
                  status: 'present',
                  checkedInAt: new Date().toISOString(),
                },
              };
            }),
          );

          showAlert('Điểm danh thành công', 'Bạn đã được ghi nhận điểm danh.');

          return;
        }

        showAlert(
          'Điểm danh thất bại',
          getCheckInFailureMessage(result.reasons),
        );
      } catch (error) {
        if (error instanceof LocationPermissionError) {
          showAlert(
            'Chưa có quyền vị trí',
            'Vui lòng cấp quyền truy cập vị trí để điểm danh.',
          );
        } else {
          showAlert('Điểm danh thất bại', 'Không thể thực hiện điểm danh.');
        }
      } finally {
        setCheckingInId(null);
      }
    },
    [checkingInId],
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>

        <Text style={styles.loadingTitle}>Đang tải</Text>

        <Text style={styles.loadingText}>
          Đang lấy danh sách phiên điểm danh...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(session) => String(session.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Điểm danh</Text>

            <Text style={styles.headerSubtitle}>
              Các phiên điểm danh của bạn
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>✓</Text>
            </View>

            <Text style={styles.emptyTitle}>Không có phiên điểm danh</Text>

            <Text style={styles.emptyText}>
              Hiện tại bạn chưa tham gia phiên điểm danh nào.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = getStudentSessionStatus(item);
          const canCheckIn = status === 'absent';
          const isCheckingIn = checkingInId === item.id;
          const statusStyle = getStatusStyle(status);

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardTitleContainer}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>

                <View style={[styles.statusBadge, statusStyle.container]}>
                  <Text style={[styles.statusText, statusStyle.text]}>
                    {getStudentSessionStatusLabel(status)}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.timeRow}>
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>MỞ CỬA</Text>

                  <Text style={styles.timeValue}>
                    {formatTime(item.openAt)}
                  </Text>
                </View>

                <View style={styles.timeArrow}>
                  <Text style={styles.arrowText}>→</Text>
                </View>

                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>ĐÓNG CỬA</Text>

                  <Text style={styles.timeValue}>
                    {formatTime(item.closeAt)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.button,
                  (!canCheckIn || isCheckingIn) && styles.buttonDisabled,
                ]}
                disabled={!canCheckIn || isCheckingIn}
                onPress={() => handleCheckIn(item.id)}
              >
                {isCheckingIn ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" />

                    <Text style={styles.buttonText}>Đang điểm danh...</Text>
                  </>
                ) : (
                  <Text style={styles.buttonText}>
                    {getCheckInButtonLabel(status)}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 32,
  },

  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginBottom: 16,
  },

  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },

  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },

  header: {
    marginBottom: 20,
    paddingHorizontal: 2,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    marginTop: 5,
    fontSize: 14,
    color: colors.textSecondary,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  cardTitleContainer: {
    flex: 1,
    paddingRight: 4,
  },

  title: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    color: colors.text,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  statusPresent: {
    backgroundColor: colors.successLight,
  },

  statusPresentText: {
    color: colors.success,
  },

  statusAbsent: {
    backgroundColor: colors.primaryLight,
  },

  statusAbsentText: {
    color: colors.primaryDark,
  },

  statusPending: {
    backgroundColor: colors.warningLight,
  },

  statusPendingText: {
    color: colors.warning,
  },

  statusClosed: {
    backgroundColor: '#F0F2F0',
  },

  statusClosedText: {
    color: colors.textSecondary,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  timeItem: {
    flex: 1,
  },

  timeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  timeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  timeArrow: {
    paddingHorizontal: 12,
  },

  arrowText: {
    fontSize: 18,
    color: colors.textMuted,
  },

  button: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,

    shadowColor: colors.primaryDark,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 2,
  },

  buttonDisabled: {
    backgroundColor: colors.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  empty: {
    flex: 1,
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginBottom: 18,
  },

  emptyIconText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primaryDark,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 7,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
