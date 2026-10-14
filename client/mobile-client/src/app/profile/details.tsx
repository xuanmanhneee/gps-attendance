import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { UpdateMyProfileRequest, UserProfileResponse } from '@gps-attendance/shared';

import { userApi } from '../../api/user.api';
import { DluLogo } from '../../components/dlu-logo';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../context/auth-context';

const NOT_UPDATED = 'Chưa cập nhật';

interface EditableProfile {
  fullname: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  programName: string;
  cohort: string;
  studyMode: string;
}

const EMPTY_PROFILE: EditableProfile = {
  fullname: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  programName: '',
  cohort: '',
  studyMode: '',
};

const profileToForm = (data: UserProfileResponse): EditableProfile => ({
  fullname: data.fullname ?? '',
  email: data.email ?? '',
  phone: data.phone ?? '',
  dateOfBirth: formatDateForInput(data.dateOfBirth ?? ''),
  gender: data.gender ?? '',
  address: data.address ?? '',
  programName: data.programName ?? '',
  cohort: data.cohort ?? '',
  studyMode: data.studyMode ?? '',
});

const formatDateForInput = (value: string): string => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

const formatDateInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const parseDateInput = (value: string): string | null | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1900 ||
    year > new Date().getFullYear() ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
};

function DetailRow({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (text: string) => void;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? NOT_UPDATED}
        placeholderTextColor="#A1AAA4"
        keyboardType={keyboardType}
        style={styles.detailInput}
        numberOfLines={1}
        autoCapitalize={label === 'Email' ? 'none' : 'sentences'}
      />
    </View>
  );
}

export default function PersonalInformationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [form, setForm] = useState<EditableProfile>(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await userApi.getProfile();
      setProfile(data);
      setForm(profileToForm(data));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const fullName = profile?.fullname ?? user?.name ?? 'Sinh viên';
  const studentCode = profile?.code ?? user?.code ?? NOT_UPDATED;
  const roleText = (profile?.role ?? user?.role) === 'student'
    ? 'Sinh viên'
    : (profile?.role ?? user?.role) === 'lecturer'
      ? 'Giảng viên'
      : 'Quản trị viên';

  const updateField = (field: keyof EditableProfile, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (form.fullname.trim().length < 2) {
      Alert.alert('Thiếu họ tên', 'Vui lòng nhập họ tên có ít nhất 2 ký tự.');
      return;
    }
    const dateOfBirth = parseDateInput(form.dateOfBirth);
    if (dateOfBirth === undefined) {
      Alert.alert('Ngày sinh không hợp lệ', 'Vui lòng nhập ngày sinh theo dạng dd/mm/yyyy.');
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      Alert.alert('Email không hợp lệ', 'Vui lòng kiểm tra lại địa chỉ email.');
      return;
    }

    const nullable = (value: string) => value.trim() || null;
    const payload: UpdateMyProfileRequest = {
      fullname: form.fullname.trim(),
      email: nullable(form.email),
      phone: nullable(form.phone),
      dateOfBirth,
      gender: nullable(form.gender),
      address: nullable(form.address),
      programName: nullable(form.programName),
      cohort: nullable(form.cohort),
      studyMode: nullable(form.studyMode),
    };

    setIsSaving(true);
    try {
      const updated = await userApi.updateProfile(payload);
      setProfile(updated);
      setForm(profileToForm(updated));
      if (user) setUser({ ...user, name: updated.fullname, code: updated.code });
      Alert.alert('Đã cập nhật', 'Thông tin cá nhân của bạn đã được lưu.');
    } catch (error) {
      Alert.alert(
        'Không thể lưu thông tin',
        error instanceof Error ? error.message : 'Vui lòng thử lại sau.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 10), paddingBottom: Math.max(insets.bottom, 12) + 14 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={21} color="#26352D" />
          </Pressable>
          <View style={styles.headerTitleGroup}>
            <DluLogo size={28} />
            <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tải thông tin...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadErrorText}>Không tải được thông tin cá nhân.{'\n'}{loadError}</Text>
            <Pressable accessibilityRole="button" onPress={() => void loadProfile()}>
              <Text style={styles.retryText}>Thử tải lại</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.identityCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{fullName.trim().charAt(0).toLocaleUpperCase()}</Text>
              </View>
              <View style={styles.identityText}>
                <Text style={styles.fullName} numberOfLines={1}>{fullName}</Text>
                <Text style={styles.identityLine}>MSSV: {studentCode}</Text>
                <Text style={styles.identityLine}>Vai trò: {roleText}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
            <Text style={styles.helpText}>Chỉnh sửa thông tin bên dưới rồi nhấn “Cập nhật thông tin” để lưu. Ngày sinh nhập theo dạng dd/mm/yyyy.</Text>
            <View style={styles.infoCard}>
              <DetailRow label="Email" value={form.email} onChangeText={(value) => updateField('email', value)} keyboardType="email-address" />
              <DetailRow label="Số điện thoại" value={form.phone} onChangeText={(value) => updateField('phone', value)} keyboardType="phone-pad" />
              <DetailRow label="Ngày sinh" value={form.dateOfBirth} onChangeText={(value) => updateField('dateOfBirth', formatDateInput(value))} placeholder="dd/mm/yyyy" keyboardType="numbers-and-punctuation" />
              <DetailRow label="Giới tính" value={form.gender} onChangeText={(value) => updateField('gender', value)} placeholder="Nam / Nữ / Khác" />
              <DetailRow label="Địa chỉ" value={form.address} onChangeText={(value) => updateField('address', value)} />
            </View>

            <Text style={styles.sectionTitle}>Thông tin học tập</Text>
            <View style={styles.infoCard}>
              <DetailRow label="Chương trình" value={form.programName} onChangeText={(value) => updateField('programName', value)} />
              <DetailRow label="Khóa học" value={form.cohort} onChangeText={(value) => updateField('cohort', value)} />
              <DetailRow label="Hệ đào tạo" value={form.studyMode} onChangeText={(value) => updateField('studyMode', value)} />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => void handleSave()}
              disabled={isSaving}
              style={({ pressed }) => [styles.updateButton, pressed && styles.updateButtonPressed, isSaving && styles.updateButtonDisabled]}
            >
              {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialCommunityIcons name="account-edit-outline" size={17} color="#FFFFFF" />}
              <Text style={styles.updateButtonText}>{isSaving ? 'Đang lưu...' : 'Cập nhật thông tin'}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F9F8' },
  content: { paddingHorizontal: 14, gap: 7 },
  header: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  backButton: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { color: '#26352D', fontSize: 15, fontWeight: '800' },
  headerTitleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  headerSpacer: { width: 36 },
  loadingBox: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 9 },
  loadingText: { color: '#738078', fontSize: 12 },
  loadErrorText: { color: '#A43D35', fontSize: 12, textAlign: 'center', lineHeight: 19 },
  retryText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  identityCard: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EEEA', marginBottom: 4 },
  avatar: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DFF1E6', borderWidth: 2, borderColor: '#EAF7F0' },
  avatarText: { color: COLORS.primary, fontSize: 26, fontWeight: '800' },
  identityText: { flex: 1, gap: 4 },
  fullName: { color: '#26352D', fontSize: 13, fontWeight: '800' },
  identityLine: { color: '#647068', fontSize: 9 },
  sectionTitle: { marginTop: 5, marginBottom: 1, color: '#26352D', fontSize: 11, fontWeight: '800' },
  helpText: { marginBottom: 4, color: '#738078', fontSize: 9, lineHeight: 14 },
  infoCard: { paddingHorizontal: 11, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EEEA' },
  detailRow: { minHeight: 33, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECE9' },
  detailLabel: { color: '#68736D', fontSize: 9 },
  detailValue: { flex: 1, color: '#34443A', fontSize: 9, fontWeight: '600', textAlign: 'right' },
  detailInput: { flex: 1, minHeight: 32, color: '#34443A', fontSize: 9, fontWeight: '600', textAlign: 'right', paddingVertical: 4, paddingHorizontal: 0 },
  updateButton: { minHeight: 42, marginTop: 7, borderRadius: 9, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  updateButtonPressed: { opacity: 0.8 },
  updateButtonDisabled: { opacity: 0.65 },
  updateButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
});
