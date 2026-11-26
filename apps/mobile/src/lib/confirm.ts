import { Alert } from 'react-native';

/**
 * Ask "are you sure?" before a destructive action, on every platform.
 *
 * react-native-web's `Alert.alert` is a no-op, so a confirm built on it never
 * shows in a browser and its button handler never runs (e.g. Delete did
 * nothing on the web app). On web this uses the browser's own `confirm()`.
 */
export function confirmAction({
  title,
  message,
  confirmText,
  cancelText,
  destructive = true,
  onConfirm,
}: {
  title: string;
  message?: string;
  confirmText: string;
  cancelText: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  if (process.env.EXPO_OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    if (typeof window !== 'undefined' && window.confirm(text)) void onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => void onConfirm() },
  ]);
}
