import { Alert, Platform } from 'react-native';

export function appAlert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    window.alert(text);
    return;
  }

  Alert.alert(title, message);
}
