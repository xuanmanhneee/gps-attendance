import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/auth-context';

export default function Index() {
  const { isLoading, isSignedIn, profileUnavailable, retryProfile } =
    useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  // Còn token nhưng chưa tải được profile: không đẩy về /login, cho thử lại.
  if (profileUnavailable) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Không tải được thông tin tài khoản. Kiểm tra kết nối rồi thử lại.
        </Text>
        <Button title="Thử lại" onPress={() => void retryProfile()} />
      </View>
    );
  }

  return <Redirect href={isSignedIn ? '/home' : '/login'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  message: {
    textAlign: 'center',
  },
});