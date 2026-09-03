import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Card } from '../../components/ui/card';
import { COLORS } from '../../constants/theme';

interface AttendanceRecord {
  id: number;
  sessionTitle: string;
  checkedInAt: string;
  validationStatus: 'approved' | 'flagged' | 'rejected';
  validationScore: number;
}

export default function HistoryScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAttendanceHistory();
  }, []);

  const loadAttendanceHistory = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement API call to get attendance history
      // const response = await AttendanceAPI.getHistory();
      // setRecords(response.data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return '✅ Được phép';
      case 'flagged':
        return '⚠️ Cảnh báo';
      case 'rejected':
        return '❌ Từ chối';
      default:
        return '❓ Không xác định';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return COLORS.success;
      case 'flagged':
        return COLORS.warning;
      case 'rejected':
        return COLORS.error;
      default:
        return COLORS.text.secondary;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch Sử Điểm Danh</Text>
        <Text style={styles.headerSubtitle}>
          Tất cả những lần điểm danh của bạn
        </Text>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.recordCard}>
            <View style={styles.recordHeader}>
              <Text style={styles.recordTitle}>{item.sessionTitle}</Text>
              <Text
                style={[
                  styles.recordStatus,
                  { color: getStatusColor(item.validationStatus) },
                ]}
              >
                {getStatusBadge(item.validationStatus)}
              </Text>
            </View>

            <Text style={styles.recordTime}>
              {new Date(item.checkedInAt).toLocaleString('vi-VN')}
            </Text>

            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Điểm số:</Text>
              <View style={styles.scoreBar}>
                <View
                  style={[
                    styles.scoreProgress,
                    {
                      width: `${item.validationScore}%`,
                      backgroundColor: getStatusColor(
                        item.validationStatus,
                      ),
                    },
                  ]}
                />
              </View>
              <Text style={styles.scoreValue}>{item.validationScore}/100</Text>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Bạn chưa có lịch sử điểm danh nào
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  recordCard: {
    marginBottom: 12,
    padding: 16,
    gap: 8,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  recordStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  recordTime: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  scoreContainer: {
    marginTop: 8,
    gap: 6,
  },
  scoreLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  scoreBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreProgress: {
    height: '100%',
    borderRadius: 3,
  },
  scoreValue: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});
