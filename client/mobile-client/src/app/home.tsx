import React, { useCallback, useEffect, useState } from 'react';
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
  MyAttendanceSessionResponse,
} from '@gps-attendance/shared';

import { attendanceSessionsApi } from '../api/attendance-sessions.api';
import { attendanceCheckInApi } from '../api/attendance-check-in.api';

// TODO: Thay bằng dữ liệu GPS/device/integrity thật.
// - expo-location
// - expo-device
// - expo-application
// - Play Integrity / App Attest
function buildStubCheckInPayload(sessionId: number) {
  return {
    sessionId,
    location: {
      latitude: 11.955604,
      longitude: 108.440353,
      accuracy: 0,
      timestamp: Date.now(),
      isMockLocation: false,
    },
    device: {
      deviceId: 'stub-device-id',
      platform: 'android' as const,
      model: 'stub-model',
    },
    integrity: {
      integrityToken: null,
    },
  };
}

type StudentSessionStatus = 'pending' | 'absent' | 'present' | 'closed';

function getStudentSessionStatus(
  session: MyAttendanceSessionResponse,
): StudentSessionStatus {
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

    case 'closed':
      return 'Đã kết thúc';
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

export default function HomeScreen() {
  const [sessions, setSessions] = useState<MyAttendanceSessionResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingInId, setCheckingInId] = useState<number | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const data = await attendanceSessionsApi.getSessions();
      setSessions(data);
    } catch {
      Alert.alert('Lỗi', 'Không tải được danh sách phiên điểm danh');
    }
  }, []);

  useEffect(() => {
    loadSessions().finally(() => {
      setLoading(false);
    });
  }, [loadSessions]);

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
        const result = await attendanceCheckInApi.checkIn(
          buildStubCheckInPayload(sessionId),
        );

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

          showAlert('Thành công', 'Đã điểm danh');
          return;
        }

        showAlert(
          'Điểm danh thất bại',
          getCheckInFailureMessage(result.reasons),
        );
      } catch {
        Alert.alert('Điểm danh thất bại', 'Không thể thực hiện điểm danh');
      } finally {
        setCheckingInId(null);
      }
    },
    [checkingInId],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(session) => String(session.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Bạn chưa tham gia phiên điểm danh nào
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = getStudentSessionStatus(item);
          const canCheckIn = status === 'absent';
          const isCheckingIn = checkingInId === item.id;

          return (
            <View style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>

              <Text style={styles.meta}>
                Mở: {new Date(item.openAt).toLocaleString('vi-VN')}
              </Text>

              <Text style={styles.meta}>
                Đóng: {new Date(item.closeAt).toLocaleString('vi-VN')}
              </Text>

              <Text style={styles.status}>
                {getStudentSessionStatusLabel(status)}
              </Text>

              <TouchableOpacity
                style={[
                  styles.button,
                  (!canCheckIn || isCheckingIn) && styles.buttonDisabled,
                ]}
                disabled={!canCheckIn || isCheckingIn}
                onPress={() => handleCheckIn(item.id)}
              >
                {isCheckingIn ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {status === 'present' ? 'Đã điểm danh' : 'Điểm danh'}
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
    backgroundColor: '#F7FBF8',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FBF8',
  },

  list: {
    padding: 16,
    flexGrow: 1,
  },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyText: {
    fontSize: 14,
    color: '#555',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },

  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },

  meta: {
    fontSize: 13,
    color: '#555',
    marginBottom: 3,
  },

  status: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },

  button: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },

  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
