import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
<<<<<<< HEAD
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
=======
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
<<<<<<< HEAD
=======
  UIManager,
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  View,
} from 'react-native';

import { useAuth } from '../context/auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { CampusFooter } from '../components/campus-footer';
import { COLORS } from '../constants/theme';

const logoSource = require('../../assets/images/logo-dlu.png');
<<<<<<< HEAD
=======

// LayoutAnimation cần bật thủ công trên Android (old architecture)
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
<<<<<<< HEAD
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLecturer, setIsLecturer] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollbarHeight, setScrollbarHeight] = useState(0);
=======

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập MSSV/email và mật khẩu.');
      return;
    }

    try {
      await login(username.trim(), password);
<<<<<<< HEAD
      router.replace('/(tabs)');
=======
      router.replace('/home');
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
    } catch {
      Alert.alert('Đăng nhập thất bại', 'MSSV/email hoặc mật khẩu không đúng.');
    }
  };

  return (
    <View style={styles.background}>
<<<<<<< HEAD
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
=======
      {/* CampusFooter tự absolute bottom:0 và tự có gradient mờ ở đỉnh, không cần bọc thêm */}
      <View style={[styles.footerWrapper, styles.footerPointerEvents]}>
        <CampusFooter />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formLayer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[styles.content, isKeyboardVisible && styles.contentCompact]}
          >
            <View
              style={[styles.header, isKeyboardVisible && styles.headerCompact]}
            >
              <Image
                source={logoSource}
                style={isKeyboardVisible ? styles.logoCompact : styles.logo}
              />

              <Text
                style={[
                  styles.university,
                  isKeyboardVisible && styles.universityCompact,
                ]}
              >
                TRƯỜNG ĐẠI HỌC ĐÀ LẠT
              </Text>

              {!isKeyboardVisible && (
                <>
                  <Text style={styles.subtitle}>
                    HỆ THỐNG ĐIỂM DANH THÔNG MINH
                  </Text>

                  <View style={styles.headerRule} />
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Đăng nhập</Text>

              <Text style={styles.cardSubtitle}>
                Vui lòng đăng nhập để tiếp tục
              </Text>

              <Text style={styles.label}>Tài khoản (MSSV / Email)</Text>

              <Input
                placeholder="Nhập MSSV hoặc email"
                value={username}
                onChangeText={setUsername}
                editable={!isLoading}
                autoCapitalize="none"
                leftIcon={
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                }
              />

              <Text style={styles.label}>Mật khẩu</Text>

              <Input
                placeholder="Nhập mật khẩu"
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
                secureTextEntry={!showPassword}
                leftIcon={
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                }
                rightIcon={
                  <Pressable
                    onPress={() => setShowPassword((visible) => !visible)}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#666666"
                    />
                  </Pressable>
                }
              />

              <View style={styles.utilityRow}>
                <Pressable
                  style={styles.rememberRow}
                  onPress={() => setRememberMe((checked) => !checked)}
                >
                  <MaterialCommunityIcons
                    name={
                      rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'
                    }
                    size={20}
                    color={COLORS.primary}
                  />

                  <Text style={styles.checkText}>Ghi nhớ đăng nhập</Text>
                </Pressable>

                <Pressable style={styles.forgotRow}>
                  <Text style={styles.forgot}>Quên mật khẩu?</Text>

                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                </Pressable>
              </View>

              <Button
                title="ĐĂNG NHẬP"
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading || !username.trim() || !password}
                style={styles.loginButton}
                icon={
                  <MaterialCommunityIcons
                    name="login-variant"
                    size={19}
                    color="#FFFFFF"
                  />
                }
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
    </View>
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
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
=======
  background: {
    flex: 1,
    backgroundColor: '#F7FBF8',
    position: 'relative',
  },

  // Footer nằm dưới cùng, zIndex thấp hơn formLayer để form đè lên được.
  // (zIndex nội bộ của CampusFooter chỉ có tác dụng bên trong chính nó,
  // không ảnh hưởng đến thứ tự với các phần tử bên ngoài như formLayer.)
  footerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    elevation: 0,
  },

  footerPointerEvents: {
    pointerEvents: 'none',
  },

  // Lớp chứa form, cùng cấp với footerWrapper -> phải set zIndex cao hơn
  // ở chính đây thì mới đè được lên footer (set trong `content` bên trong
  // là vô nghĩa vì nó không cùng cha với footer).
  formLayer: {
    flex: 1,
    zIndex: 1,
    elevation: 1, // Android cần elevation kèm zIndex mới đè đúng
  },

  scrollContent: {
    flexGrow: 1,
    // Cho phép đáy card "lấn" xuống vùng gradient mờ của footer (~200 cao,
    // 55% trên cùng là vùng mờ) thay vì chừa khoảng trắng cứng
    paddingBottom: 30,
  },

  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 42,
    justifyContent: 'center',
  },

  contentCompact: {
    paddingTop: 16,
  },

  header: {
    alignItems: 'center',
    marginBottom: 24,
  },

  headerCompact: {
    marginBottom: 10,
  },

  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },

  logoCompact: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 6,
  },

  university: {
    color: COLORS.primaryDark,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  universityCompact: {
    fontSize: 15,
  },

  subtitle: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginTop: 7,
    textAlign: 'center',
  },

  headerRule: {
    width: 180,
    height: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.25,
    marginTop: 12,
    borderRadius: 2,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 24,
    padding: 22,
    boxShadow: '0px 8px 18px rgba(22, 69, 45, 0.13)',
    elevation: 5,
  },

  cardTitle: {
    color: COLORS.primaryDark,
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
  },

  cardSubtitle: {
    color: '#777777',
    fontSize: 13,
    marginTop: 5,
    marginBottom: 16,
    textAlign: 'center',
  },

  label: {
    color: '#333333',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
    marginTop: 12,
  },

  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },

  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  checkText: {
    color: '#4A4A4A',
    fontSize: 12,
  },

  forgotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  forgot: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  loginButton: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 30,
    marginTop: 24,
    minHeight: 55,
    flexDirection: 'row',
    gap: 9,
  },
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
});
