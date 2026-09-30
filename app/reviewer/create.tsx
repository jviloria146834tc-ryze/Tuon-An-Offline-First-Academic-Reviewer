import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function CreateReviewerScreen() {
  const [reviewerName, setReviewerName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);

  const handleCreate = () => {
    // Frontend prototype only.
    // SQLite saving will be added later.
    router.replace('/(tabs)/reviewers');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color="#292929"
            />
          </Pressable>

          <Text style={styles.headerTitle}>
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
            <View style={styles.iconContainer}>
              <Ionicons
                name="book-outline"
                size={32}
                color="#58CC02"
              />
            </View>

            <Text style={styles.title}>
              What are you studying?
            </Text>

            <Text style={styles.subtitle}>
              Create a reviewer to keep your study materials,
              quizzes and flashcards organized.
            </Text>
          </View>

          {/* REVIEWER NAME */}
          <Text style={styles.label}>
            REVIEWER NAME
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="library-outline"
              size={20}
              color="#999999"
            />

            <TextInput
              style={styles.input}
              placeholder="e.g. Networking"
              placeholderTextColor="#A5A5A5"
              value={reviewerName}
              onChangeText={setReviewerName}
            />
          </View>

          {/* SUBJECT */}
          <Text style={styles.label}>
            SUBJECT / COURSE CODE
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="school-outline"
              size={20}
              color="#999999"
            />

            <TextInput
              style={styles.input}
              placeholder="e.g. IT 12"
              placeholderTextColor="#A5A5A5"
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          {/* DESCRIPTION */}
          <Text style={styles.label}>
            DESCRIPTION
          </Text>

          <View style={styles.descriptionContainer}>
            <TextInput
              style={styles.descriptionInput}
              placeholder="What topics will you study in this reviewer?"
              placeholderTextColor="#A5A5A5"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={250}
            />

            <Text style={styles.characterCount}>
              {description.length}/250
            </Text>
          </View>

          {/* REMINDER */}
          <View style={styles.reminderCard}>
            <View style={styles.reminderIcon}>
              <Ionicons
                name="notifications-outline"
                size={23}
                color="#FF9600"
              />
            </View>

            <View style={styles.reminderContent}>
              <Text style={styles.reminderTitle}>
                Daily Study Reminder
              </Text>

              <Text style={styles.reminderDescription}>
                Get reminded when it's time to review.
              </Text>
            </View>

            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{
                false: '#D9D9D9',
                true: '#B8E994',
              }}
              thumbColor={
                reminderEnabled
                  ? '#58CC02'
                  : '#FFFFFF'
              }
            />
          </View>

          {/* OFFLINE MESSAGE */}
          <View style={styles.offlineCard}>
            <Ionicons
              name="cloud-offline-outline"
              size={22}
              color="#58CC02"
            />

            <View style={styles.offlineTextContainer}>
              <Text style={styles.offlineTitle}>
                Available offline
              </Text>

              <Text style={styles.offlineDescription}>
                Your downloaded study content can be reviewed
                even without an internet connection.
              </Text>
            </View>
          </View>

        </ScrollView>

        {/* BOTTOM BUTTON */}
        <View style={styles.bottomContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              pressed && styles.buttonPressed,
            ]}
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
    backgroundColor: '#F7F9F7',
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
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '900',
    color: '#292929',
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
    backgroundColor: '#EAF9DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#292929',
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
    borderColor: '#E5E5E5',
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 21,
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#292929',
  },

  descriptionContainer: {
    minHeight: 125,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 16,
    padding: 15,
    marginBottom: 21,
  },

  descriptionInput: {
    flex: 1,
    minHeight: 75,
    fontSize: 15,
    lineHeight: 21,
    color: '#292929',
  },

  characterCount: {
    textAlign: 'right',
    fontSize: 11,
    color: '#AAAAAA',
  },

  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 18,
    padding: 15,
    marginTop: 2,
  },

  reminderIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFF3DF',
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
    color: '#292929',
  },

  reminderDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: '#929292',
    marginTop: 3,
  },

  offlineCard: {
    flexDirection: 'row',
    backgroundColor: '#EAF9DF',
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
    color: '#3D8F00',
  },

  offlineDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: '#56813A',
  },

  bottomContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
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
    backgroundColor: '#58CC02',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 4,
    borderBottomColor: '#46A302',
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