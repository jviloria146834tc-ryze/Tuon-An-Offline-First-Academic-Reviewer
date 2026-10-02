import { useState } from 'react';
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

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { createMaterial } from '../../../database/materials';

export default function AddMaterialScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewerId = Array.isArray(id) ? id[0] : id;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const saveMaterial = async () => {
    if (!reviewerId || !title.trim() || saving) return;
    setSaving(true);
    try {
      await createMaterial({
        reviewer_id: reviewerId,
        title,
        content,
        info: content.trim() ? `${content.trim().length} characters` : null,
      });
      router.back();
    } catch (error) {
      Alert.alert('Could not save material', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
          Add Study Material
        </Text>

        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroIcon}>
          <Ionicons
            name="document-text-outline"
            size={32}
            color="#58CC02"
          />
        </View>

        <Text style={styles.title}>
          Add something to study
        </Text>

        <Text style={styles.subtitle}>
          Add your notes now. Later, TUON can use your
          study material for quizzes and flashcards.
        </Text>

        <Text style={styles.label}>
          MATERIAL TITLE
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="create-outline"
            size={20}
            color="#999999"
          />

          <TextInput
            style={styles.input}
            placeholder="e.g. Introduction to Networking"
            placeholderTextColor="#AAAAAA"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <Text style={styles.label}>
          STUDY NOTES
        </Text>

        <View style={styles.notesContainer}>
          <TextInput
            style={styles.notesInput}
            multiline
            textAlignVertical="top"
            placeholder="Type or paste your study notes here..."
            placeholderTextColor="#AAAAAA"
            value={content}
            onChangeText={setContent}
          />

          <Text style={styles.characterCount}>
            {content.length} characters
          </Text>
        </View>

        <Text style={styles.orText}>OR</Text>

        <Pressable style={styles.uploadCard}>
          <View style={styles.uploadIcon}>
            <Ionicons
              name="cloud-upload-outline"
              size={27}
              color="#1CB0F6"
            />
          </View>

          <View style={styles.uploadInfo}>
            <Text style={styles.uploadTitle}>
              Upload a file
            </Text>

            <Text style={styles.uploadDescription}>
              PDF and document support will be connected later.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#BBBBBB"
          />
        </Pressable>

        <Pressable style={styles.cameraCard}>
          <View style={styles.cameraIcon}>
            <Ionicons
              name="camera-outline"
              size={27}
              color="#FF9600"
            />
          </View>

          <View style={styles.uploadInfo}>
            <Text style={styles.uploadTitle}>
              Scan handwritten notes
            </Text>

            <Text style={styles.uploadDescription}>
              Use Quick Capture to scan notes with your camera.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#BBBBBB"
          />
        </Pressable>

        <View style={styles.tipCard}>
          <Text style={styles.tipEmoji}>💡</Text>

          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>
              Study tip
            </Text>

            <Text style={styles.tipText}>
              Clear and organized notes make it easier to
              create useful quizzes and flashcards.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.buttonPressed,
          ]}
          disabled={!title.trim() || saving}
          onPress={saveMaterial}
        >
          <Ionicons
            name="checkmark-circle"
            size={21}
            color="#FFFFFF"
          />

          <Text style={styles.saveText}>
            SAVE MATERIAL
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    flexDirection: 'row',
    alignItems: 'center',
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

  placeholder: {
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
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#EAF9DF',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  title: {
    fontSize: 23,
    fontWeight: '900',
    color: '#292929',
    textAlign: 'center',
    marginTop: 14,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#888888',
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 30,
  },

  label: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    color: '#666666',
    marginBottom: 8,
  },

  inputContainer: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 22,
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#292929',
  },

  notesContainer: {
    minHeight: 190,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 17,
    padding: 15,
  },

  notesInput: {
    minHeight: 145,
    fontSize: 15,
    lineHeight: 22,
    color: '#292929',
  },

  characterCount: {
    textAlign: 'right',
    color: '#AAAAAA',
    fontSize: 11,
  },

  orText: {
    textAlign: 'center',
    color: '#AAAAAA',
    fontWeight: '800',
    fontSize: 11,
    marginVertical: 18,
  },

  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 17,
    padding: 14,
    marginBottom: 10,
  },

  cameraCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 17,
    padding: 14,
  },

  uploadIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#E6F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  cameraIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#FFF3DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  uploadInfo: {
    flex: 1,
  },

  uploadTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#292929',
  },

  uploadDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: '#929292',
  },

  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E8',
    borderRadius: 17,
    padding: 15,
    marginTop: 18,
  },

  tipEmoji: {
    fontSize: 22,
  },

  tipContent: {
    flex: 1,
    marginLeft: 11,
  },

  tipTitle: {
    fontWeight: '900',
    color: '#7D6500',
  },

  tipText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#8C7B3E',
    marginTop: 3,
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
    backgroundColor: '#58CC02',
    borderRadius: 17,
    borderBottomWidth: 4,
    borderBottomColor: '#46A302',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  buttonPressed: {
    transform: [{ translateY: 2 }],
    borderBottomWidth: 2,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
});
