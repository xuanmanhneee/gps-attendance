import React from 'react';
<<<<<<< HEAD
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
=======
import { View, Modal, StyleSheet, Text } from 'react-native';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { COLORS } from '../constants/theme';
import type { ValidationResult } from '../api/attendance-session.api';
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917

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
<<<<<<< HEAD
  const reasons = result.reasons ?? [];

  const getReasonMessage = (reason: string) => {
    const mapped: Record<string, string> = {
      TOO_MANY_ATTEMPTS: 'Bạn đã vượt quá 3 lần thử cho phiên điểm danh này. Không thể tiếp tục điểm danh phiên này.',
      LOW_CONFIDENCE_SCORE: 'Độ tin cậy của thông tin xác thực chưa đủ để điểm danh.',
      LOW_LOCATION_ACCURACY: 'Sai số GPS lớn nên vị trí chưa chắc chắn nằm gọn trong phạm vi lớp. Điểm danh đã ghi nhận, giảng viên có thể xem xét.',
      MOCK_LOCATION: 'Hệ thống phát hiện vị trí giả mạo. Vui lòng tắt vị trí giả hoặc dùng GPS thật.',
      DUPLICATE_DEVICE: 'Thiết bị này đã được dùng để điểm danh cho buổi học này.',
      OUT_OF_RANGE: 'Khoảng cách cộng sai số GPS vượt quá bán kính cho phép của buổi học.',
    };

    return mapped[reason] ?? reason;
  };
=======
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917

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
<<<<<<< HEAD
    if (isApproved) return 'Check-in thành công';
    if (isFlagged) return 'Cần xem xét (Review)';
    return 'Điểm danh bị từ chối';
=======
    if (isApproved) return 'Điểm danh thành công';
    if (isFlagged) return 'Điểm danh với cảnh báo';
    return 'Điểm danh không được phép';
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Card style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.icon}>{getStatusIcon()}</Text>
<<<<<<< HEAD
            <Text
              style={[
                styles.title,
                { color: getStatusColor() },
              ]}
            >
=======
            <Text style={[styles.title, { color: getStatusColor() }]}>
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
              {getStatusText()}
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Kết quả:</Text>
              <Text style={[styles.scoreValue, { color: getStatusColor() }]}>
<<<<<<< HEAD
                {reasons.length === 0
                  ? 'Hợp lệ'
                  : reasons.map(getReasonMessage).join(' ')}
=======
                {result.reasons.length === 0
                  ? 'Hợp lệ'
                  : result.reasons.join(', ')}
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
              </Text>
            </View>

            {isFlagged && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ Điểm danh của bạn đã được ghi nhận nhưng có những dấu hiệu
<<<<<<< HEAD
                  bất thường. Vui lòng liên hệ quản trị viên nếu bạn cho rằng
                  có lỗi.
=======
                  bất thường. Vui lòng liên hệ quản trị viên nếu bạn cho rằng có
                  lỗi.
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
                </Text>
              </View>
            )}

            {isRejected && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
<<<<<<< HEAD
                  {reasons.includes('TOO_MANY_ATTEMPTS')
                    ? '❌ Bạn đã vượt quá số lần thử cho phép. Vui lòng liên hệ giảng viên nếu cần mở lại phiên.'
                    : '❌ Vui lòng kiểm tra nguyên nhân ở trên, điều chỉnh điều kiện điểm danh và thử lại.'}
=======
                  ❌ Điểm danh không được phép. Vui lòng đảm bảo bạn ở đúng vị
                  trí và thử lại.
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
                </Text>
              </View>
            )}
          </View>

<<<<<<< HEAD
          <Button
            title="Đóng"
            onPress={onClose}
            variant="primary"
          />
=======
          <Button title="Đóng" onPress={onClose} variant="primary" />
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
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
