import React, { useState } from 'react';
import {
  TextInput,
  StyleSheet,
  View,
  TextInputProps,
  Text,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../../constants/theme';

interface InputProps extends TextInputProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  secureTextEntry?: boolean;
  editable?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
}

export const Input = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  editable = true,
  icon,
  leftIcon,
  rightIcon,
  error,
  ...props
}: InputProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = secureTextEntry;
  return (
    <View>
      <View style={styles.container}>
        {leftIcon ?? icon}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={isPassword && !isPasswordVisible}
        editable={editable}
        selectionColor={colors.primary}
        {...props}
      />
        {rightIcon ?? (isPassword && (
          <TouchableOpacity onPress={() => setIsPasswordVisible((visible) => !visible)}>
            <Text style={styles.toggle}>{isPasswordVisible ? 'Ẩn' : 'Hiện'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D9DDE2',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1A1A1A',
  },
  toggle: { color: colors.primary, paddingHorizontal: 12 },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
});
