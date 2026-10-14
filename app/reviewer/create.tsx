import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createReviewer, REVIEWER_ICONS } from '../../database/reviewers';
import { useAppTheme } from '../../utils/ThemeContext';

export default function CreateReviewerScreen() {
  const { dark } = useAppTheme();
  const [reviewerName, setReviewerName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('book-outline');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!reviewerName.trim() || !subject.trim() || saving) return;
    setSaving(true);
    try {
      await createReviewer({ name: reviewerName, subject, description, icon: selectedIcon });
      router.replace('/(tabs)/reviewers');
    } catch (error) {
      Alert.alert('Could not create reviewer', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, dark && { backgroundColor: '#0B1220' }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER */}
        <View style={[styles.header, dark && { backgroundColor: '#111B2B', borderBottomColor: '#2B3A52' }]}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              dark && { backgroundColor: '#172235', borderColor: '#2B3A52' },
              pressed && (dark ? { backgroundColor: '#1E2D44' } : { backgroundColor: '#EBF2FE' }),
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={dark ? '#F2F6FF' : '#15264B'}
            />
          </Pressable>

          <Text style={[styles.headerTitle, dark && { color: '#F2F6FF' }]}>
            Create Reviewer
          </Text>

          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* INTRO */}
          <View style={styles.intro}>
            <View style={[styles.iconContainer, dark && { backgroundColor: '#172235' }]}>
              <Ionicons
                name={selectedIcon as any}
                size={32}
                color="#2563EB"
              />
            </View>

            <Text style={[styles.title, dark && { color: '#F2F6FF' }]}>
              What are you studying?
            </Text>

            <Text style={[styles.subtitle, dark && { color: '#AAB7CC' }]}>
              Create a reviewer to keep your study materials,
              quizzes and flashcards organized.
            </Text>
          </View>

          {/* REVIEWER NAME */}
          <Text style={[styles.label, dark && { color: '#AAB7CC' }]}>
            REVIEWER NAME
          </Text>

          <View style={[styles.inputContainer, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
            <Ionicons
              name="library-outline"
              size={20}
              color={dark ? '#7CB0FF' : '#999999'}
            />

            <TextInput
              style={[styles.input, dark && { color: '#F2F6FF' }]}
              placeholder="e.g. Networking"
              placeholderTextColor={dark ? '#64748B' : '#A5A5A5'}
              value={reviewerName}
              onChangeText={setReviewerName}
            />
          </View>

          {/* SUBJECT */}
          <Text style={[styles.label, dark && { color: '#AAB7CC' }]}>
            SUBJECT / COURSE CODE
          </Text>

          <View style={[styles.inputContainer, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
            <Ionicons
              name="school-outline"
              size={20}
              color={dark ? '#7CB0FF' : '#999999'}
            />

            <TextInput
              style={[styles.input, dark && { color: '#F2F6FF' }]}
              placeholder="e.g. IT 12"
              placeholderTextColor={dark ? '#64748B' : '#A5A5A5'}
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          {/* DESCRIPTION */}
          <Text style={[styles.label, dark && { color: '#AAB7CC' }]}>
            DESCRIPTION
          </Text>

          <View style={[styles.descriptionContainer, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
            <TextInput
              style={[styles.descriptionInput, dark && { color: '#F2F6FF' }]}
              placeholder="What topics will you study in this reviewer?"
              placeholderTextColor={dark ? '#64748B' : '#A5A5A5'}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={250}
            />

            <Text style={[styles.characterCount, dark && { color: '#64748B' }]}>
              {description.length}/250
            </Text>
          </View>

          {/* ICON PICKER */}
          <Text style={[styles.label, dark && { color: '#AAB7CC' }]}>
            CHOOSE AN ICON
          </Text>

          <View style={[styles.iconGrid, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
            {REVIEWER_ICONS.map((item) => {
              const isSelected = selectedIcon === item.icon;
              return (
                <Pressable
                  key={item.icon}
                  onPress={() => setSelectedIcon(item.icon)}
                  style={[
                    styles.iconTile,
                    isSelected && (dark ? styles.iconTileSelectedDark : styles.iconTileSelected),
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} icon`}
                >
                  <View
                    style={[
                      styles.iconTileBadge,
                      dark && { backgroundColor: '#111B2B' },
                      isSelected && styles.iconTileBadgeSelected,
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={isSelected ? '#FFFFFF' : (dark ? '#7CB0FF' : '#2563EB')}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.iconTileLabel,
                      dark && { color: '#AAB7CC' },
                      isSelected && (dark ? { color: '#60A5FA', fontWeight: '800' } : styles.iconTileLabelSelected),
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* REMINDER */}
          <View style={[styles.reminderCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
            <View style={[styles.reminderIcon, dark && { backgroundColor: '#2A2012' }]}>
              <Ionicons
                name="notifications-outline"
                size={23}
                color="#D79A00"
              />
            </View>

            <View style={styles.reminderContent}>
              <Text style={[styles.reminderTitle, dark && { color: '#F2F6FF' }]}>
                Daily Study Reminder
              </Text>

              <Text style={[styles.reminderDescription, dark && { color: '#AAB7CC' }]}>
                Get reminded when it&apos;s time to review.
              </Text>
            </View>

            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{
                false: dark ? '#334155' : '#D9D9D9',
                true: '#B8E994',
              }}
              thumbColor={
                reminderEnabled
                  ? '#2563EB'
                  : '#FFFFFF'
              }
            />
          </View>

          {/* OFFLINE MESSAGE */}
          <View style={[styles.offlineCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
            <Ionicons
              name="cloud-offline-outline"
              size={22}
              color="#2563EB"
            />

            <View style={styles.offlineTextContainer}>
              <Text style={[styles.offlineTitle, dark && { color: '#F2F6FF' }]}>
                Available offline
              </Text>

              <Text style={[styles.offlineDescription, dark && { color: '#AAB7CC' }]}>
                Your downloaded study content can be reviewed
                even without an internet connection.
              </Text>
            </View>
          </View>

        </ScrollView>

        {/* BOTTOM BUTTON */}
        <View style={[styles.bottomContainer, dark && { backgroundColor: '#0B1220', borderTopColor: '#2B3A52' }]}>
          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              (!reviewerName.trim() || !subject.trim() || saving) && { opacity: 0.5 },
              pressed && styles.buttonPressed,
            ]}
            disabled={!reviewerName.trim() || !subject.trim() || saving}
            onPress={handleCreate}
          >
            <Text style={styles.createButtonText}>
              CREATE REVIEWER
            </Text>

            <Ionicons
              name="arrow-forward"
              size={20}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FF',
  },

  keyboardView: {
    flex: 1,
  },

  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9E9E9',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '900',
    color: '#15264B',
  },

  headerPlaceholder: {
    width: 42,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 30,
  },

  intro: {
    alignItems: 'center',
    marginBottom: 30,
  },

  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#15264B',
    textAlign: 'center',
  },

  subtitle: {
    maxWidth: 390,
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#888888',
    textAlign: 'center',
  },

  label: {
    fontSize: 11,
    fontWeight: '900',
    color: '#666666',
    letterSpacing: 1.1,
    marginBottom: 8,
    marginLeft: 2,
  },

  inputContainer: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 21,
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#15264B',
  },

  descriptionContainer: {
    minHeight: 125,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 16,
    padding: 15,
    marginBottom: 21,
  },

  descriptionInput: {
    flex: 1,
    minHeight: 75,
    fontSize: 15,
    lineHeight: 21,
    color: '#15264B',
  },

  characterCount: {
    textAlign: 'right',
    fontSize: 11,
    color: '#AAAAAA',
  },

  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 18,
    padding: 10,
    marginBottom: 21,
    justifyContent: 'space-between',
  },

  iconTile: {
    width: '23.5%',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 12,
    marginVertical: 4,
  },

  iconTileSelected: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },

  iconTileSelectedDark: {
    backgroundColor: '#1E2D44',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },

  iconTileBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  iconTileBadgeSelected: {
    backgroundColor: '#2563EB',
  },

  iconTileLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666666',
    textAlign: 'center',
  },

  iconTileLabelSelected: {
    color: '#2563EB',
    fontWeight: '800',
  },

  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 18,
    padding: 15,
    marginTop: 2,
  },

  reminderIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFF5D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  reminderContent: {
    flex: 1,
  },

  reminderTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#15264B',
  },

  reminderDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: '#929292',
    marginTop: 3,
  },

  offlineCard: {
    flexDirection: 'row',
    backgroundColor: '#EAF2FF',
    borderRadius: 17,
    padding: 16,
    marginTop: 14,
  },

  offlineTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  offlineTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1748BA',
  },

  offlineDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: '#47658B',
  },

  bottomContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#DCE5F2',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 18,
  },

  createButton: {
    width: '100%',
    maxWidth: 556,
    alignSelf: 'center',
    height: 57,
    borderRadius: 17,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 4,
    borderBottomColor: '#1748BA',
  },

  buttonPressed: {
    transform: [{ translateY: 2 }],
    borderBottomWidth: 2,
  },

  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
});
