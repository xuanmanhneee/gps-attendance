import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Text,
} from 'react-native';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { COLORS } from '../constants/theme';
import type { ValidationResult } from '../api/attendance.api';

interface AttendanceModalProps {
  visible: boolean;
  result: ValidationResult | null;
  onClose: () => void;
}

export const AttendanceModal = ({
  visible,
  result,
  onClose,
}: AttendanceModalProps) => {
  if (!result) {
    return null;
  }

  const isApproved = result.status === 'VALID';
  const isFlagged = result.status === 'REVIEW';
  const isRejected = result.status === 'REJECTED';

  const getStatusIcon = () => {
    if (isApproved) return '✅';
    if (isFlagged) return '⚠️';
    return '❌';
  };

  const getStatusColor = () => {
    if (isApproved) return COLORS.success;
    if (isFlagged) return COLORS.warning;
    return COLORS.error;
  };

  const getStatusText = () => {
    if (isApproved) return 'Điểm danh thành công';
    if (isFlagged) return 'Điểm danh với cảnh báo';
    return 'Điểm danh không được phép';
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Card style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.icon}>{getStatusIcon()}</Text>
            <Text
              style={[
                styles.title,
                { color: getStatusColor() },
              ]}
            >
              {getStatusText()}
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Kết quả:</Text>
              <Text style={[styles.scoreValue, { color: getStatusColor() }]}>
                {result.reasons.length === 0 ? 'Hợp lệ' : result.reasons.join(', ')}
              </Text>
            </View>

            {isFlagged && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ Điểm danh của bạn đã được ghi nhận nhưng có những dấu hiệu
                  bất thường. Vui lòng liên hệ quản trị viên nếu bạn cho rằng
                  có lỗi.
                </Text>
              </View>
            )}

            {isRejected && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  ❌ Điểm danh không được phép. Vui lòng đảm bảo bạn ở đúng vị
                  trí và thử lại.
                </Text>
              </View>
            )}
          </View>

          <Button
            title="Đóng"
            onPress={onClose}
            variant="primary"
          />
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    width: '100%',
    paddingVertical: 24,
    gap: 16,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    gap: 12,
  },
  scoreContainer: {
    gap: 8,
  },
  scoreLabel: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  scoreBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreProgress: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  detailsContainer: {
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  warningBox: {
    backgroundColor: COLORS.warning + '15',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  warningText: {
    fontSize: 12,
    color: COLORS.text.primary,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: COLORS.error + '15',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.text.primary,
    lineHeight: 18,
  },
});
