import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

/**
 * Android Expo Go throws while expo-notifications registers its remote push
 * token listener. Keep the module out of the Expo Go startup path; notification
 * features remain available in a development or standalone build.
 */
export async function loadNotifications() {
  if (
    Platform.OS === 'android' &&
    isRunningInExpoGo()
  ) {
    return null;
  }

  return import('expo-notifications');
}
