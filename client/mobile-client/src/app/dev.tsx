import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import DebugDeviceCard from '../components/debug-device-card';
import { Button } from '../components/ui/button';
import { useCheckInContext } from '../hooks/use-check-in-context';
import {
  isMockLocationForced,
  restoreDevMode,
  setMockLocationForced,
} from '../services/dev-mode';
import { colors } from '../../theme';

// Trang ẩn: chỉ vào được khi bật "Chế độ dev" ở tab Profile. Hiển thị đúng dữ
// liệu GPS/device/integrity sẽ gửi lên server, kèm các nút tuỳ chỉnh để thử
// những nhánh xử lý khó tạo bằng tay (mock location, deviceId lạ).
export default function DevScreen() {
  const { location, device, integrity, error, refresh, reset } =
    useCheckInContext();
  const [mockLocation, setMockLocation] = useState(false);

  // _layout cũng khôi phục lúc mở app, nhưng gọi lại ở đây để state của màn hình
  // đúng ngay cả khi lần khôi phục lúc mở app chưa xong.
  useEffect(() => {
    void restoreDevMode().then(() => setMockLocation(isMockLocationForced()));
  }, []);

  const handleToggleMockLocation = (enabled: boolean) => {
    setMockLocation(enabled);
    // Cờ được gán đồng bộ trong bộ nhớ nên refresh ngay là đọc được giá trị mới.
    void setMockLocationForced(enabled).catch(() => {});
    void refresh();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        <Text style={styles.title}>Dev</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DebugDeviceCard context={{ location, device, integrity, error }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tuỳ chỉnh</Text>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Giả lập mock location</Text>

              <Text style={styles.rowHint}>
                Ép cờ isMockLocation = true khi điểm danh. Server sẽ trả REJECTED
                / MOCK_LOCATION.
              </Text>
            </View>

            <Switch
              value={mockLocation}
              onValueChange={handleToggleMockLocation}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Button
            title="Đổi deviceId mới"
            size="medium"
            onPress={() => void reset()}
            style={styles.action}
          />

          <Button
            title="Làm mới dữ liệu thiết bị"
            size="medium"
            onPress={() => void refresh()}
            style={styles.action}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 12,
  },

  back: {
    padding: 4,
  },

  backPressed: {
    opacity: 0.6,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },

  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,

    borderWidth: 1,
    borderColor: colors.border,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  rowInfo: {
    flex: 1,
  },

  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  rowHint: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },

  action: {
    marginTop: 12,
  },
});
