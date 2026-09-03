import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../context/auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { CampusFooter } from '../components/campus-footer';
import { COLORS } from '../constants/theme';

const logoSource = require('../../assets/images/logo-dlu.png');

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLecturer, setIsLecturer] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollbarHeight, setScrollbarHeight] = useState(0);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập MSSV/email và mật khẩu.');
      return;
    }

    try {
      await login(username.trim(), password);
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Đăng nhập thất bại', 'MSSV/email hoặc mật khẩu không đúng.');
    }
  };

  return (
    <View style={styles.background}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.flex, styles.contentLayer]}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
          onContentSizeChange={(_, height) => setContentHeight(height)}
          onScroll={(event) => setScrollOffset(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <View style={styles.header}>
            <Image source={logoSource} style={styles.logo} />
            <Text style={styles.university}>TRƯỜNG ĐẠI HỌC ĐÀ LẠT</Text>
            <Text style={styles.subtitle}>HỆ THỐNG ĐIỂM DANH THÔNG MINH</Text>
            <View style={styles.headerRule} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Đăng nhập</Text>
            <Text style={styles.cardSubtitle}>Vui lòng đăng nhập để tiếp tục</Text>
            <View style={styles.cardSliderTrack}>
              <View style={styles.cardSliderThumb} />
            </View>

            <Text style={styles.label}>Tài khoản (MSSV / Email)</Text>
            <Input
              placeholder="Nhập MSSV hoặc email"
              value={username}
              onChangeText={setUsername}
              editable={!isLoading}
              autoCapitalize="none"
              leftIcon={<MaterialCommunityIcons name="account-outline" size={20} color={COLORS.primary} />}
            />

            <Text style={styles.label}>Mật khẩu</Text>
            <Input
              placeholder="Nhập mật khẩu"
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
              secureTextEntry={!showPassword}
              leftIcon={<MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.primary} />}
              rightIcon={
                <Pressable onPress={() => setShowPassword((visible) => !visible)} hitSlop={8}>
                  <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666666" />
                </Pressable>
              }
            />

            <View style={styles.optionsGroup}>
              <Pressable style={styles.optionRow} onPress={() => setIsLecturer((checked) => !checked)}>
                <MaterialCommunityIcons name={isLecturer ? 'checkbox-marked' : 'checkbox-blank-outline'} size={21} color={COLORS.primary} />
                <Text style={styles.checkText}>Đăng nhập với quyền Giảng viên</Text>
              </Pressable>

              {isLecturer && (
                <View style={styles.infoBox}>
                  <MaterialCommunityIcons name="school-outline" size={24} color={COLORS.primaryDark} />
                  <Text style={styles.infoText}>Quyền Giảng viên cho phép quản lý lớp học và theo dõi dữ liệu điểm danh.</Text>
                </View>
              )}

              <View style={styles.utilityRow}>
                <Pressable style={[styles.optionRow, styles.rememberRow]} onPress={() => setRememberMe((checked) => !checked)}>
                  <MaterialCommunityIcons name={rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={COLORS.primary} />
                  <Text style={styles.checkText}>Ghi nhớ đăng nhập</Text>
                </Pressable>
                <Pressable style={styles.forgotRow}>
                  <Text style={styles.forgot}>Quên mật khẩu?</Text>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={COLORS.primary} />
                </Pressable>
              </View>
            </View>

            <Button
              title="ĐĂNG NHẬP"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
              icon={<MaterialCommunityIcons name="login-variant" size={19} color="#FFFFFF" />}
            />
          </View>
        </ScrollView>
        {contentHeight > viewportHeight && (
          <View
            pointerEvents="none"
            style={styles.scrollbar}
            onLayout={(event) => setScrollbarHeight(event.nativeEvent.layout.height)}
          >
            <View style={styles.scrollbarTrack}>
              <View
                style={[
                  styles.scrollbarThumb,
                  {
                    height: Math.max(34, scrollbarHeight * viewportHeight / contentHeight),
                    top: Math.min(
                      scrollbarHeight - Math.max(34, scrollbarHeight * viewportHeight / contentHeight),
                      scrollOffset / (contentHeight - viewportHeight) * scrollbarHeight,
                    ),
                  },
                ]}
              />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <CampusFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { flex: 1, backgroundColor: '#F7FBF8' },
  contentLayer: { zIndex: 2, elevation: 2 },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 42, paddingBottom: 155 },
  scrollbar: { position: 'absolute', right: 5, top: 42, bottom: 112, width: 5 },
  scrollbarTrack: { flex: 1, width: 4, alignSelf: 'center', backgroundColor: 'rgba(0,77,37,0.12)', borderRadius: 4 },
  scrollbarThumb: { position: 'absolute', left: 0, width: 4, backgroundColor: 'rgba(0,104,55,0.7)', borderRadius: 4 },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 88, height: 88, borderRadius: 44, marginBottom: 12 },
  university: { color: COLORS.primaryDark, fontSize: 19, fontWeight: '800', textAlign: 'center', letterSpacing: 0.3 },
  subtitle: { color: COLORS.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginTop: 7, textAlign: 'center' },
  headerRule: { width: 210, height: 2, backgroundColor: COLORS.primary, opacity: 0.25, marginTop: 12, borderRadius: 2 },
  card: { backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 24, padding: 22, shadowColor: '#16452D', shadowOpacity: 0.13, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  cardTitle: { color: COLORS.primaryDark, fontSize: 25, fontWeight: '800', textAlign: 'center' },
  cardSubtitle: { color: '#777777', fontSize: 13, marginTop: 5, marginBottom: 22, textAlign: 'center' },
  cardSliderTrack: { alignSelf: 'center', width: 116, height: 3, borderRadius: 3, backgroundColor: '#D8EBDD', marginTop: -10, marginBottom: 9, overflow: 'hidden' },
  cardSliderThumb: { alignSelf: 'center', width: 48, height: 3, borderRadius: 3, backgroundColor: COLORS.primary },
  label: { color: '#333333', fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 12 },
  optionsGroup: { width: '100%', alignItems: 'flex-start', gap: 12, marginTop: 18 },
  optionRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 7 },
  rememberRow: { width: 'auto' },
  utilityRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 20 },
  checkText: { color: '#4A4A4A', fontSize: 12, flex: 0 },
  infoBox: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: COLORS.primaryLight, borderRadius: 12, padding: 12, marginTop: 12 },
  infoText: { color: COLORS.primaryDark, fontSize: 12, lineHeight: 18, flex: 1 },
  forgotRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  forgot: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  loginButton: { backgroundColor: COLORS.primaryDark, borderRadius: 30, marginTop: 24, minHeight: 55, flexDirection: 'row', gap: 9 },
});
