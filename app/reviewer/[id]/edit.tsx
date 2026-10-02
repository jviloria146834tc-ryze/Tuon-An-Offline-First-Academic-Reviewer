import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getReviewerById, updateReviewer } from '../../../database/reviewers';

export default function EditReviewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const reviewerId = Array.isArray(id) ? id[0] : id;
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getReviewerById(reviewerId ?? '').then(reviewer => {
      if (!active) return;
      if (!reviewer) {
        Alert.alert('Reviewer not found', 'This reviewer is no longer available.');
        router.back();
        return;
      }
      setName(reviewer.name);
      setSubject(reviewer.subject);
      setDescription(reviewer.description ?? '');
    }).catch(error => {
      if (active) Alert.alert('Could not load reviewer', error instanceof Error ? error.message : 'Please try again.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reviewerId]);

  const canSave =
    name.trim().length > 0 &&
    subject.trim().length > 0;

  const saveReviewer = async () => {
    if (!canSave || !reviewerId || saving) return;
    setSaving(true);
    try {
      await updateReviewer(reviewerId, { name, subject, description });
      router.replace(`/reviewer/${reviewerId}`);
    } catch (error) {
      Alert.alert('Could not save changes', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
            onPress={() => router.replace(`/reviewer/${reviewerId}`)}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color="#292929"
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Edit Reviewer
        </Text>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroIcon}>
          <Ionicons
            name="create-outline"
            size={32}
            color="#58CC02"
          />
        </View>

        <Text style={styles.title}>
          Reviewer details
        </Text>

        <Text style={styles.subtitle}>
          Update the information for this reviewer.
        </Text>

        <Text style={styles.label}>
          REVIEWER NAME
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="book-outline"
            size={20}
            color="#999999"
          />

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Reviewer name"
            placeholderTextColor="#AAAAAA"
          />
        </View>

        <Text style={styles.label}>
          SUBJECT
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="school-outline"
            size={20}
            color="#999999"
          />

          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject"
            placeholderTextColor="#AAAAAA"
          />
        </View>

        <Text style={styles.label}>
          DESCRIPTION
        </Text>

        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Add a short description..."
          placeholderTextColor="#AAAAAA"
          multiline
          textAlignVertical="top"
        />

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color="#1CB0F6"
          />

          <Text style={styles.infoText}>
            {loading ? 'Loading reviewer details…' : 'Changes are saved locally on this device.'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <Pressable
          style={[
            styles.saveButton,
            !canSave && styles.disabledButton,
          ]}
            disabled={!canSave || loading || saving}
          onPress={saveReviewer}
        >
          <Ionicons
            name="checkmark"
            size={21}
            color="#FFFFFF"
          />

          <Text style={styles.saveText}>
            SAVE CHANGES
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9F7',
  },

  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    paddingHorizontal: 20,
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

  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    padding: 22,
    paddingBottom: 40,
  },

  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#EAF9DF',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  title: {
    textAlign: 'center',
    fontSize: 23,
    fontWeight: '900',
    color: '#292929',
    marginTop: 14,
  },

  subtitle: {
    textAlign: 'center',
    fontSize: 13,
    color: '#888888',
    marginTop: 6,
    marginBottom: 30,
  },

  label: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#666666',
    marginBottom: 9,
  },

  inputContainer: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 17,
    paddingHorizontal: 15,
    marginBottom: 22,
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#292929',
  },

  textArea: {
    minHeight: 130,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 17,
    padding: 15,
    fontSize: 14,
    lineHeight: 21,
    color: '#292929',
    marginBottom: 17,
  },

  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EAF7FF',
    borderRadius: 17,
    padding: 15,
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 11,
    lineHeight: 17,
    color: '#49758C',
  },

  bottom: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingHorizontal: 22,
    paddingVertical: 14,
  },

  saveButton: {
    width: '100%',
    maxWidth: 556,
    alignSelf: 'center',
    height: 57,
    borderRadius: 17,
    backgroundColor: '#58CC02',
    borderBottomWidth: 4,
    borderBottomColor: '#46A302',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  disabledButton: {
    opacity: 0.45,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});
