import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { isRetryableApiError } from '@gps-attendance/shared';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

import { useAuth } from '../context/auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { CampusFooter } from '../components/campus-footer';
import { colors } from '../../theme';

// LayoutAnimation cần bật thủ công trên Android (old architecture)
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

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

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    try {
      await login(username.trim(), password);
      router.replace('/home');
    } catch (error) {
      Alert.alert(
        'Đăng nhập thất bại',
        isRetryableApiError(error)
          ? error.message
          : 'Tên đăng nhập hoặc mật khẩu không đúng.',
      );
    }
  };

  return (
    <View style={styles.background}>
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
              <View style={isKeyboardVisible ? styles.logoCompact : styles.logo}>
                <MaterialCommunityIcons
                  name="map-marker-check"
                  size={isKeyboardVisible ? 28 : 42}
                  color={colors.primaryDark}
                />
              </View>

              <Text
                style={[
                  styles.brandName,
                  isKeyboardVisible && styles.brandNameCompact,
                ]}
              >
                GPS ATTENDANCE
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

              <Text style={styles.label}>Tên đăng nhập</Text>

              <Input
                placeholder="Nhập tên đăng nhập"
                value={username}
                onChangeText={setUsername}
                editable={!isLoading}
                autoCapitalize="none"
                leftIcon={
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={20}
                    color={colors.primary}
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
                    color={colors.primary}
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
                    color={colors.primary}
                  />

                  <Text style={styles.checkText}>Ghi nhớ đăng nhập</Text>
                </Pressable>

                <Pressable style={styles.forgotRow}>
                  <Text style={styles.forgot}>Quên mật khẩu?</Text>

                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={16}
                    color={colors.primary}
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
    </View>
  );
}

const styles = StyleSheet.create({
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF5EE',
  },

  logoCompact: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF5EE',
  },

  brandName: {
    color: colors.primaryDark,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  brandNameCompact: {
    fontSize: 15,
  },

  subtitle: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginTop: 7,
    textAlign: 'center',
  },

  headerRule: {
    width: 180,
    height: 2,
    backgroundColor: colors.primary,
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
    color: colors.primaryDark,
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
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  loginButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 30,
    marginTop: 24,
    minHeight: 55,
    flexDirection: 'row',
    gap: 9,
  },
});
