import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MyAttendanceSessionResponse } from '@gps-attendance/shared';

type StudentSessionStatus =
  | 'pending'
  | 'absent'
  | 'present'
  | 'late'
  | 'excused'
  | 'closed'
  | 'cancelled';

interface AttendanceSessionCardProps {
  session: MyAttendanceSessionResponse;
  onCheckIn: () => void;
}

export function AttendanceSessionCard({
  session,
  onCheckIn,
}: AttendanceSessionCardProps) {
  const status = getStudentSessionStatus(session);
  const canCheckIn = status === 'absent';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {session.title}
        </Text>

        <StatusBadge status={status} />
      </View>

      <View style={styles.schedule}>
        <Text style={styles.scheduleLabel}>Thời gian</Text>
        <Text style={styles.scheduleValue}>
          {formatDateTime(session.openAt)} – {formatTime(session.closeAt)}
        </Text>
      </View>

      <Pressable
        disabled={!canCheckIn}
        onPress={onCheckIn}
        style={({ pressed }) => [
          styles.button,
          !canCheckIn && styles.buttonDisabled,
          pressed && canCheckIn && styles.buttonPressed,
        ]}
      >
        <Text
          style={[styles.buttonText, !canCheckIn && styles.buttonTextDisabled]}
        >
          Điểm danh
        </Text>
      </Pressable>
    </View>
  );
}

function getStudentSessionStatus(
  session: MyAttendanceSessionResponse,
): StudentSessionStatus {
  if (session.status === 'pending') {
    return 'pending';
  }

  if (session.status === 'closed') {
    return 'closed';
  }

  if (session.status === 'cancelled') {
    return 'cancelled';
  }

  return session.myAttendance.status;
}

function StatusBadge({ status }: { status: StudentSessionStatus }) {
  return (
    <View style={[styles.badge, styles[`badge_${status}`]]}>
      <Text style={[styles.badgeText, styles[`badgeText_${status}`]]}>
        {getStatusLabel(status)}
      </Text>
    </View>
  );
}

function getStatusLabel(status: StudentSessionStatus): string {
  switch (status) {
    case 'pending':
      return 'Chưa mở';
    case 'absent':
      return 'Chưa điểm danh';
    case 'present':
      return 'Đã điểm danh';
    case 'late':
      return 'Đi muộn';
    case 'excused':
      return 'Có phép';
    case 'closed':
      return 'Đã kết thúc';
    case 'cancelled':
      return 'Đã hủy';
  }
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },

  badge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },

  badge_pending: {
    backgroundColor: '#f3f4f6',
  },

  badge_absent: {
    backgroundColor: '#fff7ed',
  },

  badge_present: {
    backgroundColor: '#f0fdf4',
  },

  badge_late: {
    backgroundColor: '#fff7ed',
  },

  badge_excused: {
    backgroundColor: '#eff6ff',
  },

  badge_closed: {
    backgroundColor: '#f3f4f6',
  },

  badge_cancelled: {
    backgroundColor: '#fef2f2',
  },

  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  badgeText_pending: {
    color: '#6b7280',
  },

  badgeText_absent: {
    color: '#c2410c',
  },

  badgeText_present: {
    color: '#15803d',
  },

  badgeText_late: {
    color: '#c2410c',
  },

  badgeText_excused: {
    color: '#2563eb',
  },

  badgeText_closed: {
    color: '#6b7280',
  },

  badgeText_cancelled: {
    color: '#b91c1c',
  },

  schedule: {
    gap: 4,
  },

  scheduleLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },

  scheduleValue: {
    fontSize: 14,
    color: '#374151',
  },

  button: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },

  buttonDisabled: {
    backgroundColor: '#e5e7eb',
  },

  buttonPressed: {
    opacity: 0.7,
  },

  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  buttonTextDisabled: {
    color: '#9ca3af',
  },
});
