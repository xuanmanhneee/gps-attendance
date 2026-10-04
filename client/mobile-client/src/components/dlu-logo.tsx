import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface DluLogoProps {
  size?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

export function DluLogo({ size = 36, containerStyle }: DluLogoProps) {
  return (
    <View
      accessibilityLabel="Logo Trường Đại học Đà Lạt"
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: Math.round(size * 0.32) },
        containerStyle,
      ]}
    >
      <Image
        source={require('../../assets/images/logo-dlu.png')}
        style={{ width: size, height: size }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
