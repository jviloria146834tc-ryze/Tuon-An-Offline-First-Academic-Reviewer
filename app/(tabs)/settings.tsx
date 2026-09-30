import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

export default function SettingsScreen() {
  const [studyReminders, setStudyReminders] =
    useState(true);

  const [dueCardAlerts, setDueCardAlerts] =
    useState(true);

  const [darkMode, setDarkMode] =
    useState(false);

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
                Student
              </Text>

              <Text style={styles.profileEmail}>
                student@tuon.app
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
                  Study data stored on this device
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
                    backgroundColor: '#E6F4FF',
                  },
                ]}
              >
                <Ionicons
                  name="cloud-outline"
                  size={21}
                  color="#1CB0F6"
                />
              </View>

              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>
                  Cloud Sync
                </Text>

                <Text style={styles.settingSubtitle}>
                  Firebase sync will be connected later
                </Text>
              </View>

              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>
                  LATER
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
                  Not synced yet
                </Text>
              </View>
            </View>
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