import { useEffect } from 'react';
import { StatusBar as NativeStatusBar, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { AuthProvider } from '../context/auth-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    NativeStatusBar.setHidden(true, 'none');
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <NativeStatusBar hidden={true} />
        <Stack screenOptions={{ headerShown: false, statusBarHidden: true }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="attendance/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="attendance-location/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="profile/details" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
