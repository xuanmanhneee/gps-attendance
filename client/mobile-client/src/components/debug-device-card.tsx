import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { CheckInContext } from '@/hooks/use-check-in-context';

import { colors } from '../../theme/';

// Card chỉ để hiển thị: dữ liệu do màn hình cha truyền vào, còn refresh/reset
// nằm ở các nút của màn hình cha (trang Dev) để tránh 2 nguồn state.
type Props = {
  context: Pick<CheckInContext, 'location' | 'device' | 'integrity' | 'error'>;
};

export default function DebugDeviceCard({ context }: Props) {
  const { location, device, integrity, error } = context;

  const coords = location
    ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
    : (error ?? 'Đang lấy...');

  const token = integrity?.integrityToken ?? 'null';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Thông tin thiết bị</Text>
      <Text style={styles.subtitle}>Debug</Text>

      <View style={styles.divider} />

      <InfoRow
        label="Vị trí"
        value={coords}
        valueType={location ? 'normal' : 'muted'}
      />

      <InfoRow
        label="Độ chính xác"
        value={location ? `${Math.round(location.accuracy)} m` : '-'}
        valueType={location ? 'normal' : 'muted'}
      />

      <InfoRow
        label="Device ID"
        value={device?.deviceId ?? 'Đang tải...'}
        valueType={device ? 'normal' : 'muted'}
      />

      <InfoRow
        label="Model"
        value={device?.model ?? '-'}
        valueType={device ? 'normal' : 'muted'}
      />

      <InfoRow
        label="Mock location"
        value={location ? String(location.isMockLocation) : '-'}
        valueType={
          !location ? 'muted' : location.isMockLocation ? 'danger' : 'success'
        }
      />

      <InfoRow label="Integrity token" value={token} valueType="muted" />
    </View>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
  valueType?: 'normal' | 'success' | 'muted' | 'danger';
};

function InfoRow({ label, value, valueType = 'normal' }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>

      <Text
        style={[
          styles.value,
          valueType === 'success' && styles.successValue,
          valueType === 'muted' && styles.mutedValue,
          valueType === 'danger' && styles.dangerValue,
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,

    borderWidth: 1,
    borderColor: colors.border,
  },

  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  subtitle: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 28,
    paddingVertical: 4,
  },

  label: {
    width: 120,
    fontSize: 12,
    color: colors.textSecondary,
  },

  value: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },

  successValue: {
    color: colors.success,
  },

  mutedValue: {
    color: colors.textMuted,
  },

  dangerValue: {
    color: colors.danger,
  },
});
