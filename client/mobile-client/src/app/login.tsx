import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AppTextInput from '../components/AppTextInput';
import AppButton from '../components/AppButton';

import { authApi, AuthErrorCode } from '@gps-attendance/shared';
import type { LoginRequest } from '@gps-attendance/shared';
import { saveToken } from '../services/token-storage';

export default function LoginScreen() {
  const router = useRouter();

  const [form, setForm] = useState<LoginRequest>({
    username: '',
    password: '',
  });

  const updateForm = (field: keyof LoginRequest, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogin = async () => {
    if (!form.username || !form.password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }
    const res = await authApi.userLogin(form);

    if (!res.success){
        switch (res.code) {
            case AuthErrorCode.INVALID_CREDENTIALS:
                Alert.alert('Lỗi', 'Sai tên đăng nhập hoặc mật khẩu');
                break;
            
            case AuthErrorCode.ACCOUNT_NOT_LINKED:
                Alert.alert('Lỗi', 'Tài khoản chưa liên kết');
                break;

            case AuthErrorCode.ROLE_NOT_ALLOWED:
                Alert.alert('Lỗi', 'Vai trò không được cho phép')
                break;
            
            default:
                Alert.alert('Lỗi', res.message ?? 'Đăng nhập thất bại, vui lòng thử lại');
        }
    }
    else{
        await saveToken(res.data.accessToken);
        router.push('/home');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng nhập</Text>

      <AppTextInput
        placeholder="Username"
        value={form.username}
        onChangeText={(text) => updateForm('username', text)}
        autoCapitalize="none"
      />

      <AppTextInput
        placeholder="Mật khẩu"
        value={form.password}
        onChangeText={(text) => updateForm('password', text)}
        secureTextEntry
      />

      <AppButton title="Đăng nhập" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
});