import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { getCurrentAuthUser, logoutUser } from '../../firebase/auth';
import { getSyncStatusInfo, performSync, SyncStatusInfo } from '../../firebase/sync';

export default function SettingsScreen() {
  const [studyReminders, setStudyReminders] =
    useState(true);

  const [dueCardAlerts, setDueCardAlerts] =
    useState(true);

  const [darkMode, setDarkMode] =
    useState(false);

  const [syncInfo, setSyncInfo] = useState<SyncStatusInfo | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userEmail, setUserEmail] = useState(() => {
    const user = getCurrentAuthUser();
    return user?.email || 'Offline / Guest Mode';
  });
  const [userName, setUserName] = useState(() => {
    const user = getCurrentAuthUser();
    return user?.displayName || user?.email?.split('@')[0] || 'Local Student';
  });

  const refreshSyncAndUser = useCallback(async () => {
    const user = getCurrentAuthUser();
    setUserEmail(user?.email || 'Offline / Guest Mode');
    setUserName(user?.displayName || user?.email?.split('@')[0] || 'Local Student');
    const info = await getSyncStatusInfo();
    setSyncInfo(info);
  }, []);

  useEffect(() => {
    let active = true;
    getSyncStatusInfo().then(info => {
      if (active) {
        setSyncInfo(info);
      }
    });
    return () => {
      active = false;
    };
  }, []);

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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.smallHeading}>
              PREFERENCES
            </Text>

            <Text style={styles.title}>
              Settings
            </Text>

            <Text style={styles.subtitle}>
              Customize your TUON experience.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>
            PROFILE
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.profileCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.avatar}>
              <Ionicons
                name="person"
                size={28}
                color="#58CC02"
              />
            </View>

            <View style={styles.profileContent}>
              <Text style={styles.profileName}>
                {userName}
              </Text>

              <Text style={styles.profileEmail}>
                {userEmail}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#BBBBBB"
            />
          </Pressable>

          <Text style={styles.sectionLabel}>
            STUDY
          </Text>

          <View style={styles.settingsGroup}>
            <SettingsRow
              icon="calendar-outline"
              iconColor="#58CC02"
              iconBackground="#EAF9DF"
              title="Review Schedule"
              subtitle="Manage your study reminders"
            />

            <View style={styles.divider} />

            <SettingsRow
              icon="school-outline"
              iconColor="#9069CD"
              iconBackground="#F2EAFE"
              title="Study Preferences"
              subtitle="Customize your review experience"
            />
          </View>

          <Text style={styles.sectionLabel}>
            NOTIFICATIONS
          </Text>

          <View style={styles.settingsGroup}>
            <ToggleRow
              icon="notifications-outline"
              iconColor="#FF9600"
              iconBackground="#FFF3DF"
              title="Study Reminders"
              subtitle="Remind me to study"
              value={studyReminders}
              onValueChange={setStudyReminders}
            />

            <View style={styles.divider} />

            <ToggleRow
              icon="time-outline"
              iconColor="#1CB0F6"
              iconBackground="#E6F4FF"
              title="Due Card Alerts"
              subtitle="Notify me about cards due for review"
              value={dueCardAlerts}
              onValueChange={setDueCardAlerts}
            />
          </View>

          <Text style={styles.sectionLabel}>
            DATA & SYNC
          </Text>

          <View style={styles.settingsGroup}>
            <View style={styles.settingRow}>
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: '#EAF9DF',
                  },
                ]}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={21}
                  color="#58CC02"
                />
              </View>

              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>
                  Offline Data
                </Text>

                <Text style={styles.settingSubtitle}>
                  Stored locally in device SQLite
                </Text>
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  LOCAL
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: syncInfo?.isConfigured ? '#E6F4FF' : '#F5F5F5',
                  },
                ]}
              >
                <Ionicons
                  name="cloud-outline"
                  size={21}
                  color={syncInfo?.isConfigured ? '#1CB0F6' : '#999999'}
                />
              </View>

              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>
                  Cloud Sync
                </Text>

                <Text style={styles.settingSubtitle}>
                  {syncInfo?.isConfigured
                    ? syncInfo.pendingCount > 0
                      ? `${syncInfo.pendingCount} local change(s) queued`
                      : 'All changes synced with cloud'
                    : 'Firebase not configured (offline mode)'}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: !syncInfo?.isConfigured
                      ? '#EEEEEE'
                      : isSyncing
                      ? '#E6F4FF'
                      : syncInfo.state === 'error'
                      ? '#FFF0F0'
                      : '#EAF9DF',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: !syncInfo?.isConfigured
                        ? '#888888'
                        : isSyncing
                        ? '#1CB0F6'
                        : syncInfo.state === 'error'
                        ? '#FF4B4B'
                        : '#58CC02',
                    },
                  ]}
                >
                  {!syncInfo?.isConfigured
                    ? 'OFFLINE'
                    : isSyncing
                    ? 'SYNCING'
                    : syncInfo.state === 'error'
                    ? 'ERROR'
                    : 'ACTIVE'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: '#F2EAFE',
                  },
                ]}
              >
                <Ionicons
                  name="sync-outline"
                  size={21}
                  color="#9069CD"
                />
              </View>

              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>
                  Last Synced
                </Text>

                <Text style={styles.settingSubtitle}>
                  {formatLastSync(syncInfo?.lastSyncedAt)}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

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
                    backgroundColor: '#EAF9DF',
                  },
                ]}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#58CC02" />
                ) : (
                  <Ionicons
                    name="cloud-upload-outline"
                    size={21}
                    color="#58CC02"
                  />
                )}
              </View>

              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: '#58CC02' }]}>
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Text>

                <Text style={styles.settingSubtitle}>
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

          <Text style={styles.sectionLabel}>
            APPEARANCE
          </Text>

          <View style={styles.settingsGroup}>
            <ToggleRow
              icon="moon-outline"
              iconColor="#9069CD"
              iconBackground="#F2EAFE"
              title="Dark Mode"
              subtitle="Use dark appearance"
              value={darkMode}
              onValueChange={setDarkMode}
            />
          </View>

          <Text style={styles.sectionLabel}>
            ABOUT
          </Text>

          <View style={styles.settingsGroup}>
            <SettingsRow
              icon="information-circle-outline"
              iconColor="#1CB0F6"
              iconBackground="#E6F4FF"
              title="About TUON"
              subtitle="Learn more about the app"
            />

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: '#EAF9DF',
                  },
                ]}
              >
                <Ionicons
                  name="apps-outline"
                  size={21}
                  color="#58CC02"
                />
              </View>

              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>
                  Version
                </Text>

                <Text style={styles.settingSubtitle}>
                  TUON 1.0.0
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionLabel}>
            ACCOUNT
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.pressed,
            ]}
            onPress={handleLogout}
          >
            <Ionicons
              name="log-out-outline"
              size={21}
              color="#FF4B4B"
            />

            <Text style={styles.logoutText}>
              Log Out
            </Text>
          </Pressable>

          <Text style={styles.footerText}>
            TUON • Learn anywhere, even offline.
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
};

function SettingsRow({
  icon,
  iconColor,
  iconBackground,
  title,
  subtitle,
}: SettingsRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingRow,
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
        <Text style={styles.settingTitle}>
          {title}
        </Text>

        <Text style={styles.settingSubtitle}>
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

type ToggleRowProps = SettingsRowProps & {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function ToggleRow({
  icon,
  iconColor,
  iconBackground,
  title,
  subtitle,
  value,
  onValueChange,
}: ToggleRowProps) {
  return (
    <View style={styles.settingRow}>
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
        <Text style={styles.settingTitle}>
          {title}
        </Text>

        <Text style={styles.settingSubtitle}>
          {subtitle}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: '#D8D8D8',
          true: '#A5E879',
        }}
        thumbColor={
          value ? '#58CC02' : '#F4F4F4'
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9F7',
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
    marginBottom: 23,
  },

  smallHeading: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#58CC02',
    marginBottom: 3,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#292929',
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
    borderColor: '#E5E5E5',
    borderRadius: 20,
    padding: 14,
    marginBottom: 20,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#EAF9DF',
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
    color: '#292929',
  },

  profileEmail: {
    fontSize: 11,
    color: '#999999',
    marginTop: 3,
  },

  settingsGroup: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
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
    color: '#292929',
  },

  settingSubtitle: {
    fontSize: 10,
    lineHeight: 14,
    color: '#999999',
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginLeft: 54,
  },

  statusBadge: {
    backgroundColor: '#EAF9DF',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  statusBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#58CC02',
  },

  pendingBadge: {
    backgroundColor: '#FFF3DF',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  pendingBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FF9600',
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

  logoutText: {
    color: '#FF4B4B',
    fontSize: 13,
    fontWeight: '900',
  },

  footerText: {
    textAlign: 'center',
    color: '#AAAAAA',
    fontSize: 10,
    marginTop: 22,
    marginBottom: 10,
  },
});