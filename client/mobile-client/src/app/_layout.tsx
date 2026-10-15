import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { AuthProvider } from '../context/auth-context';
import { restoreDevMode } from '../services/dev-mode';

export default function RootLayout() {
  // Khôi phục cờ dev (dev mode + ép mock location) ngay lúc mở app: giá trị chỉ
  // nằm trong bộ nhớ, nên phải nạp sẵn để luồng điểm danh dùng đúng dù người
  // dùng không mở trang Dev hay tab Profile.
  useEffect(() => {
    void restoreDevMode();
  }, []);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="dev" />
      </Stack>
    </AuthProvider>
  );
}
