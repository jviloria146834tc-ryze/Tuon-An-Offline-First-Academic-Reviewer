import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Network from 'expo-network';
import { getActiveStudentId, getCurrentAuthUser, logoutUser } from '../../firebase/auth';
import { getSyncStatusInfo, performSync, SyncStatusInfo } from '../../firebase/sync';
import { getDatabase } from '../../database/database';
import { useAppTheme } from '../../utils/ThemeContext';

export default function SettingsScreen() {
  const { dark } = useAppTheme();
  const [syncInfo, setSyncInfo] = useState<SyncStatusInfo | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [userEmail, setUserEmail] = useState(() => {
    const user = getCurrentAuthUser();
    return user?.email || '';
  });
  const [userName, setUserName] = useState(() => {
    const user = getCurrentAuthUser();
    return user?.displayName || user?.email?.split('@')[0] || 'Local Student';
  });

  const refreshSyncAndUser = useCallback(async () => {
    const user = getCurrentAuthUser();
    setUserEmail(user?.email || '');
    let name = user?.displayName || user?.email?.split('@')[0] || 'Local Student';
    try {
      const id = await getActiveStudentId();
      const db = await getDatabase();
      const profile = await db.getFirstAsync<{ display_name: string | null }>(
        'SELECT display_name FROM students WHERE student_id = ?', id
      );
      if (profile?.display_name) name = profile.display_name;
    } catch { /* Keep the current Firebase or guest name if local profile lookup fails. */ }
    setUserName(name);
    const [info, netState] = await Promise.all([
      getSyncStatusInfo(),
      Network.getNetworkStateAsync().catch(() => ({ isConnected: true })),
    ]);
    setSyncInfo(info);
    setIsOnline(Boolean(netState?.isConnected));
  }, []);

  useFocusEffect(useCallback(() => { void refreshSyncAndUser(); }, [refreshSyncAndUser]));

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await performSync();
      await refreshSyncAndUser();
      if (res.success) {
        Alert.alert(
          'Sync Complete',
          `Successfully pushed ${res.pushedCount} local updates and pulled ${res.pulledCount} cloud items.`
        );
      } else {
        Alert.alert('Sync Incomplete', res.error || 'Could not complete cloud synchronization.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown sync error.';
      Alert.alert('Sync Error', msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out? Your local data will remain saved on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logoutUser();
            router.replace('/');
          },
        },
      ]
    );
  };

  const formatLastSync = (timestamp: string | null | undefined) => {
    if (!timestamp) return 'Not synced yet';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timestamp;
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, dark && { backgroundColor: '#0B1220' }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.smallHeading, dark && { color: '#7CB0FF' }]}>
                PREFERENCES
              </Text>
              <Text style={[styles.title, dark && { color: '#F2F6FF' }]}>
                Settings
              </Text>
              <Text style={[styles.subtitle, dark && { color: '#AAB7CC' }]}>
                Customize your TUON experience.
              </Text>
            </View>
            <Pressable
              style={[styles.notificationButton, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}
              onPress={() => router.push('/notifications')}
              accessibilityRole="button"
              accessibilityLabel="Open notifications"
            >
              <Ionicons name="notifications-outline" size={22} color={dark ? '#F2F6FF' : '#15264B'} />
            </Pressable>
          </View>

          <Text style={[styles.sectionLabel, dark && { color: '#AAB7CC' }]}>
            PROFILE
          </Text>

          <Pressable style={[styles.profileCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]} onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Edit personal profile">
            <View style={[styles.avatar, dark && { backgroundColor: '#102544' }]}>
              <Ionicons
                name="person"
                size={28}
                color={dark ? '#7CB0FF' : '#2563EB'}
              />
            </View>

            <View style={styles.profileContent}>
              <Text style={[styles.profileName, dark && { color: '#F2F6FF' }]}>
                {userName}
              </Text>

              {userEmail ? (
                <Text style={[styles.profileEmail, dark && { color: '#AAB7CC' }]}>
                  {userEmail}
                </Text>
              ) : null}
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={dark ? '#64748B' : '#BBBBBB'}
            />
          </Pressable>

          <Text style={[styles.sectionLabel, dark && { color: '#AAB7CC' }]}>
            DATA & SYNC
          </Text>

          <View style={[styles.settingsGroup, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
            <View style={styles.settingRow}>
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: !isOnline
                      ? dark ? '#331B10' : '#FFF4ED'
                      : !syncInfo?.isConfigured
                      ? dark ? '#1C2433' : '#F4F7FC'
                      : dark ? '#102544' : '#E5F8FF',
                  },
                ]}
              >
                <Ionicons
                  name={!isOnline ? 'cloud-offline-outline' : 'cloud-outline'}
                  size={21}
                  color={
                    !isOnline
                      ? '#EA580C'
                      : !syncInfo?.isConfigured
                      ? (dark ? '#64748B' : '#999999')
                      : (dark ? '#7CB0FF' : '#00A8E8')
                  }
                />
              </View>

              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, dark && { color: '#F2F6FF' }]}>
                  Cloud Sync
                </Text>

                <Text style={[styles.settingSubtitle, dark && { color: '#AAB7CC' }]}>
                  {!isOnline
                    ? syncInfo?.pendingCount && syncInfo.pendingCount > 0
                      ? `${syncInfo.pendingCount} local change(s) queued (offline)`
                      : 'Device is offline • Saved locally'
                    : !syncInfo?.isConfigured
                    ? 'Firebase not configured'
                    : isSyncing
                    ? 'Syncing with cloud...'
                    : syncInfo?.pendingCount && syncInfo.pendingCount > 0
                    ? `${syncInfo.pendingCount} local change(s) queued`
                    : 'All changes synced with cloud'}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: !isOnline
                      ? dark ? '#331B10' : '#FFF4ED'
                      : !syncInfo?.isConfigured
                      ? dark ? '#1E293B' : '#E8EEF8'
                      : isSyncing
                      ? '#E5F8FF'
                      : syncInfo?.state === 'error'
                      ? '#FFF0F0'
                      : dark ? '#0F291E' : '#ECFDF5',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: !isOnline
                        ? '#EA580C'
                        : !syncInfo?.isConfigured
                        ? '#888888'
                        : isSyncing
                        ? '#00A8E8'
                        : syncInfo?.state === 'error'
                        ? '#FF4B4B'
                        : '#16A34A',
                    },
                  ]}
                >
                  {!isOnline
                    ? 'OFFLINE'
                    : !syncInfo?.isConfigured
                    ? 'OFFLINE'
                    : isSyncing
                    ? 'SYNCING'
                    : syncInfo?.state === 'error'
                    ? 'ERROR'
                    : 'ONLINE'}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, dark && styles.dividerDark]} />

            <View style={styles.settingRow}>
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: dark ? '#102544' : '#E5F8FF',
                  },
                ]}
              >
                <Ionicons
                  name="sync-outline"
                  size={21}
                  color="#0087C4"
                />
              </View>

              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, dark && { color: '#F2F6FF' }]}>
                  Last Synced
                </Text>

                <Text style={[styles.settingSubtitle, dark && { color: '#AAB7CC' }]}>
                  {formatLastSync(syncInfo?.lastSyncedAt)}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, dark && styles.dividerDark]} />

            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.pressed,
                isSyncing && { opacity: 0.6 },
              ]}
              onPress={handleSync}
              disabled={isSyncing}
            >
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: dark ? '#102544' : '#EAF2FF',
                  },
                ]}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Ionicons
                    name="cloud-upload-outline"
                    size={21}
                    color="#2563EB"
                  />
                )}
              </View>

              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: '#2563EB' }]}>
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Text>

                <Text style={[styles.settingSubtitle, dark && { color: '#AAB7CC' }]}>
                  Push offline changes and fetch cloud updates
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#BBBBBB"
              />
            </Pressable>
          </View>

          <Text style={[styles.sectionLabel, dark && { color: '#AAB7CC' }]}>
            APPEARANCE
          </Text>

          <View style={[styles.settingsGroup, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
            <DarkModeRow />
          </View>

          <Text style={[styles.sectionLabel, dark && { color: '#AAB7CC' }]}>
            ABOUT
          </Text>

          <View style={[styles.settingsGroup, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
            <View style={styles.aboutHeaderRow}>
              <Image
                source={require('../../assets/tuon-logo.png')}
                style={[styles.aboutLogo, dark && { borderColor: '#2B3A52' }]}
                resizeMode="cover"
                accessibilityLabel="TUON logo"
              />
              <View style={styles.aboutHeaderInfo}>
                <Text style={[styles.aboutAppName, dark && { color: '#F2F6FF' }]}>
                  TUON
                </Text>
                <Text style={[styles.aboutTagline, dark && { color: '#AAB7CC' }]}>
                  Learn smarter, even when offline.
                </Text>
                <View style={[styles.aboutVersionBadge, dark && { backgroundColor: '#102544' }]}>
                  <Text style={[styles.aboutVersionText, dark && { color: '#7CB0FF' }]}>
                    v1.0.0 • Offline-First
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.divider, dark && styles.dividerDark]} />

            <SettingsRow
              icon="information-circle-outline"
              iconColor="#00A8E8"
              iconBackground={dark ? '#0C283B' : '#E5F8FF'}
              title="About TUON"
              subtitle="Organize notes, flashcards & quizzes"
              onPress={() => Alert.alert('About TUON', 'TUON is your offline-first academic study reviewer. Organize study notes, flashcards with spaced repetition, and practice quizzes directly on your device.')}
            />
          </View>

          <Text style={[styles.sectionLabel, dark && { color: '#AAB7CC' }]}>
            ACCOUNT
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              dark && styles.logoutButtonDark,
              pressed && styles.pressed,
            ]}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Log Out"
          >
            <Ionicons
              name="log-out-outline"
              size={21}
              color={dark ? '#FF6B6B' : '#FF4B4B'}
            />

            <Text style={[styles.logoutText, dark && styles.logoutTextDark]}>
              Log Out
            </Text>
          </Pressable>

          <Text style={[styles.footerText, dark && styles.footerTextDark]}>
            TUON © 2026. All Rights Reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
};

function SettingsRow({
  icon,
  iconColor,
  iconBackground,
  title,
  subtitle,
  onPress,
}: SettingsRowProps) {
  const { dark } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        dark && { backgroundColor: '#172235' },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.settingIcon,
          {
            backgroundColor: iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={iconColor}
        />
      </View>

      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, dark && { color: '#F2F6FF' }]}>
          {title}
        </Text>

        <Text style={[styles.settingSubtitle, dark && { color: '#AAB7CC' }]}>
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color="#BBBBBB"
      />
    </Pressable>
  );
}

function DarkModeRow() {
  const { dark, setDark } = useAppTheme();
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: dark ? '#102544' : '#E5F8FF' }]}>
        <Ionicons name={dark ? 'moon' : 'moon-outline'} size={21} color={dark ? '#7CB0FF' : '#0087C4'} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, dark && { color: '#F2F6FF' }]}>Dark Mode</Text>
        <Text style={[styles.settingSubtitle, dark && { color: '#AAB7CC' }]}>{dark ? 'Dark appearance is on' : 'Use a darker appearance'}</Text>
      </View>
      <Switch value={dark} onValueChange={value => { void setDark(value); }} accessibilityLabel="Dark Mode" />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FF',
  },

  scrollContent: {
    paddingBottom: 35,
  },

  container: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 23,
  },

  headerText: {
    flex: 1,
  },

  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5F2',
    marginTop: 4,
    marginLeft: 12,
  },

  smallHeading: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#2563EB',
    marginBottom: 3,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#15264B',
  },

  subtitle: {
    fontSize: 13,
    color: '#888888',
    marginTop: 5,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
    color: '#777777',
    marginTop: 8,
    marginBottom: 9,
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 20,
    padding: 14,
    marginBottom: 20,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  profileContent: {
    flex: 1,
  },

  profileName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#15264B',
  },

  profileEmail: {
    fontSize: 11,
    color: '#999999',
    marginTop: 3,
  },

  settingsGroup: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 20,
    paddingHorizontal: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },

  settingRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },

  settingIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  settingContent: {
    flex: 1,
    paddingRight: 8,
  },

  settingTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15264B',
  },

  settingSubtitle: {
    fontSize: 10,
    lineHeight: 14,
    color: '#999999',
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor: '#E8EEF8',
    marginLeft: 54,
  },

  dividerDark: {
    backgroundColor: '#26354D',
  },

  statusBadge: {
    backgroundColor: '#EAF2FF',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  statusBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#2563EB',
  },

  pendingBadge: {
    backgroundColor: '#FFF5D6',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  pendingBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#D79A00',
  },

  pressed: {
    opacity: 0.7,
  },

  logoutButton: {
    height: 55,
    borderRadius: 17,
    backgroundColor: '#FFF0F0',
    borderWidth: 2,
    borderColor: '#FFDADA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  logoutButtonDark: {
    backgroundColor: '#261214',
    borderColor: '#4A1D23',
  },

  logoutText: {
    color: '#FF4B4B',
    fontSize: 13,
    fontWeight: '900',
  },

  logoutTextDark: {
    color: '#FF6B6B',
  },

  footerText: {
    textAlign: 'center',
    color: '#AAAAAA',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 22,
    marginBottom: 12,
  },

  footerTextDark: {
    color: '#64748B',
  },

  aboutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },

  aboutLogo: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DCE5F2',
  },

  aboutHeaderInfo: {
    flex: 1,
  },

  aboutAppName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15264B',
    letterSpacing: 0.5,
  },

  aboutTagline: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
    fontWeight: '500',
  },

  aboutVersionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF2FF',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },

  aboutVersionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
  },
});
