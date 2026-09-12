import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Card } from '../../components/ui/card';
import { COLORS } from '../../constants/theme';
import {
  AttendanceAPI,
  type AttendanceHistoryItem,
} from '../../api/attendance.api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/auth-context';
import { ApiRequestError } from '../../api/api';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { token, lastLoginAt } = useAuth();
  const [records, setRecords] = useState<AttendanceHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Visible height strictly excluding bottom tab bar (60 + insets.bottom) and top safe inset
  const visibleHeight = Math.max(300, windowHeight - (60 + insets.bottom) - insets.top);

  useEffect(() => {
    loadAttendanceHistory(true);
  }, []);

  const loadAttendanceHistory = async (showLoader = false) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      if (!token) {
        setRecords([]);
        return;
      }

      const response = await AttendanceAPI.getAttendanceHistory(token);

      if (!response.success) {
        throw new Error(response.message || 'Không thể tải lịch sử điểm danh');
      }

      setRecords(response.data);
    } catch (error) {
      console.error('Failed to load history:', error);
      if (error instanceof ApiRequestError && error.status === 401) {
        return;
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await loadAttendanceHistory(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return '✅ Có mặt';
      case 'late':
        return '⚠️ Đi muộn';
      case 'absent':
        return '❌ Vắng mặt';
      case 'excused':
        return '📝 Có phép';
      default:
        return '❓ Chưa rõ';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return COLORS.success;
      case 'late':
        return COLORS.warning;
      case 'absent':
        return COLORS.error;
      case 'excused':
        return COLORS.primary;
      default:
        return COLORS.text.secondary;
    }
  };

  const getSessionStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return '🟢 Đang diễn ra';
      case 'pending':
        return '🟡 Sắp mở';
      case 'closed':
        return '⚪ Đã kết thúc';
      default:
        return status;
    }
  };

  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top + 16 }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải lịch sử điểm danh...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            minHeight: Math.max(450, windowHeight - 60 - insets.bottom - insets.top),
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: Math.max(insets.top, 28) + 16,
            paddingBottom: Math.max(insets.bottom, 20) + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={styles.centerWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Lịch Sử Điểm Danh</Text>
            <View style={styles.lastLoginBadge}>
              <Text style={styles.lastLoginIcon}>🕒</Text>
              <Text style={styles.lastLoginText}>
                Lần đăng nhập gần nhất:{' '}
                {lastLoginAt
                  ? new Date(lastLoginAt).toLocaleString('vi-VN')
                  : 'Vừa mới đăng nhập'}
              </Text>
            </View>
          </View>

          {/* Summary Stats */}
          {records.length > 0 && (
            <View style={styles.statsContainer}>
              <View style={[styles.statBox, { borderLeftColor: '#3B82F6' }]}>
                <Text style={styles.statLabel}>Tổng buổi</Text>
                <Text style={styles.statNumber}>{records.length}</Text>
              </View>
              <View style={[styles.statBox, { borderLeftColor: COLORS.success }]}>
                <Text style={styles.statLabel}>Có mặt</Text>
                <Text style={[styles.statNumber, { color: COLORS.success }]}>
                  {presentCount}
                </Text>
              </View>
              <View style={[styles.statBox, { borderLeftColor: COLORS.error }]}>
                <Text style={styles.statLabel}>Vắng mặt</Text>
                <Text style={[styles.statNumber, { color: COLORS.error }]}>
                  {absentCount}
                </Text>
              </View>
            </View>
          )}

          {/* Record List or Empty State */}
          {records.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyStateIcon}>📋</Text>
              <Text style={styles.emptyStateTitle}>Chưa có lịch sử điểm danh</Text>
              <Text style={styles.emptyStateText}>
                Bạn chưa được chỉ định vào phiên điểm danh nào hoặc chưa có bản ghi
                nào được tạo.
              </Text>
            </Card>
          ) : (
            records.map((item) => (
              <Card key={item.id.toString()} style={styles.recordCard}>
                {/* Title & Status */}
                <View style={styles.recordHeader}>
                  <View style={styles.titleWrapper}>
                    <Text style={styles.recordTitle}>{item.sessionTitle}</Text>
                    <Text style={styles.sessionStatusBadge}>
                      {getSessionStatusText(item.sessionStatus)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badgeContainer,
                      { backgroundColor: `${getStatusColor(item.status)}15` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.recordStatus,
                        { color: getStatusColor(item.status) },
                      ]}
                    >
                      {getStatusBadge(item.status)}
                    </Text>
                  </View>
                </View>

                {/* Check-in Time */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Thời gian điểm danh:</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      item.checkedInAt ? styles.checkedInText : styles.unCheckedText,
                    ]}
                  >
                    {item.checkedInAt
                      ? new Date(item.checkedInAt).toLocaleString('vi-VN')
                      : 'Chưa điểm danh'}
                  </Text>
                </View>

                {/* Session Time Range */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Thời gian buổi học:</Text>
                  <Text style={styles.infoValueSub}>
                    {new Date(item.openAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {new Date(item.closeAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    ({new Date(item.openAt).toLocaleDateString('vi-VN')})
                  </Text>
                </View>

                {/* GPS & Device details if checked in */}
                {item.checkedInAt && (
                  <View style={styles.gpsDetailsBox}>
                    <View style={styles.gpsRow}>
                      <Text style={styles.gpsLabel}>📍 Khoảng cách tới phòng:</Text>
                      <Text style={styles.gpsValue}>
                        {item.distanceMeters !== null
                          ? `${item.distanceMeters}m / Bán kính ${item.radius}m`
                          : `Trong bán kính ${item.radius}m`}
                      </Text>
                    </View>

                    {item.accuracy !== null && (
                      <View style={styles.gpsRow}>
                        <Text style={styles.gpsLabel}>🎯 Độ chính xác GPS:</Text>
                        <Text style={styles.gpsValue}>±{item.accuracy}m</Text>
                      </View>
                    )}

                    {item.deviceId && (
                      <View style={styles.gpsRow}>
                        <Text style={styles.gpsLabel}>📱 Thiết bị ghi nhận:</Text>
                        <Text style={styles.gpsValueSmall} numberOfLines={1}>
                          {item.deviceId}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  centerWrapper: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  lastLoginBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'center',
  },
  lastLoginIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  lastLoginText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 4,
  },
  recordCard: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleWrapper: {
    flex: 1,
    marginRight: 8,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  sessionStatusBadge: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginTop: 3,
  },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recordStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoValueSub: {
    fontSize: 12,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  checkedInText: {
    color: COLORS.success,
  },
  unCheckedText: {
    color: COLORS.error,
  },
  gpsDetailsBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  gpsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsLabel: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  gpsValue: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
  },
  gpsValueSmall: {
    fontSize: 10,
    color: '#EF4444',
    maxWidth: '55%',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyStateIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
