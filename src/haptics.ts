import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS !== 'web';

export const tick = () => {
  if (enabled) void Haptics.selectionAsync();
};

export const thud = () => {
  if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

export const success = () => {
  if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};
