import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import {
  OpaqueColorValue,
  Platform,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';

type Props = {
  ios: SymbolViewProps['name']; // ép đúng kiểu SFSymbols7_0 mà SymbolView yêu cầu
  android: ComponentProps<typeof MaterialIcons>['name'];
  size?: number;
  color: string | OpaqueColorValue;
  weight?: SymbolWeight;
  style?: StyleProp<ViewStyle & TextStyle>;
};

export function IconSymbol({
  ios,
  android,
  size = 24,
  color,
  weight,
  style,
}: Props) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={ios}
        size={size}
        tintColor={color}
        weight={weight}
        style={style as StyleProp<ViewStyle>}
      />
    );
  }
  return (
    <MaterialIcons
      name={android}
      size={size}
      color={color}
      style={style as StyleProp<TextStyle>}
    />
  );
}
