import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { createMaterial, deleteMaterial, getMaterialById, updateMaterial } from '../../../database/materials';
import { useAppTheme } from '../../../utils/ThemeContext';

export default function AddMaterialScreen() {
  const { dark } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewerId = Array.isArray(id) ? id[0] : id;
  const materialParam = useLocalSearchParams<{ materialId?: string }>().materialId;
  const materialId = Array.isArray(materialParam) ? materialParam[0] : materialParam;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!materialId) return;
    getMaterialById(materialId).then(material => {
      if (material) { setTitle(material.title); setContent(material.content ?? ''); }
    }).catch(error => Alert.alert('Could not load material', String(error)));
  }, [materialId]);

  const saveMaterial = async () => {
    if (!reviewerId || !title.trim() || saving) return;
    setSaving(true);
    try {
      const input = {
        reviewer_id: reviewerId,
        title,
        content,
        info: content.trim() ? `${content.trim().length} characters` : null,
      };
      if (materialId) await updateMaterial(materialId, input);
      else await createMaterial(input);
      router.back();
    } catch (error) {
      Alert.alert('Could not save material', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!materialId) return;
    Alert.alert('Delete material?', 'This removes the material from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteMaterial(materialId); router.back(); }
        catch (error) { Alert.alert('Could not delete material', error instanceof Error ? error.message : 'Please try again.'); }
      } },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, dark && { backgroundColor: '#0B1220' }]}>
      <View style={[styles.header, dark && { backgroundColor: '#111B2B', borderBottomColor: '#2B3A52' }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={dark ? '#F2F6FF' : '#15264B'}
          />
        </Pressable>

        <Text style={[styles.headerTitle, dark && { color: '#F2F6FF' }]}>
          {materialId ? 'Edit Study Material' : 'Add Study Material'}
        </Text>

        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroIcon, dark && { backgroundColor: '#172235' }]}>
          <Ionicons
            name="document-text-outline"
            size={32}
            color="#2563EB"
          />
        </View>

        <Text style={[styles.title, dark && { color: '#F2F6FF' }]}>
          Add something to study
        </Text>

        <Text style={[styles.subtitle, dark && { color: '#AAB7CC' }]}>
            Type or paste notes here. You can edit them later.
        </Text>

        <Text style={[styles.label, dark && { color: '#AAB7CC' }]}>
          MATERIAL TITLE
        </Text>

        <View style={[styles.inputContainer, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
          <Ionicons
            name="create-outline"
            size={20}
            color="#999999"
          />

          <TextInput
            style={[styles.input, dark && { color: '#F2F6FF' }]}
            placeholder="e.g. Introduction to Networking"
            placeholderTextColor="#AAAAAA"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <Text style={[styles.label, dark && { color: '#AAB7CC' }]}>
          STUDY NOTES
        </Text>

        <View style={[styles.notesContainer, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
          <TextInput
            style={[styles.notesInput, dark && { color: '#F2F6FF' }]}
            multiline
            textAlignVertical="top"
            placeholder="Type or paste your study notes here..."
            placeholderTextColor="#AAAAAA"
            value={content}
            onChangeText={setContent}
          />

          <Text style={[styles.characterCount, dark && { color: '#AAB7CC' }]}>
            {content.length} characters
          </Text>
        </View>

        <Text style={[styles.orText, dark && { color: '#AAB7CC' }]}>OPTIONAL FEATURES</Text>

        <Pressable style={[styles.uploadCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]} onPress={() => Alert.alert('File import not available yet', 'Use Quick Capture to type notes into the app.')}>
          <View style={styles.uploadIcon}>
            <Ionicons
              name="cloud-upload-outline"
              size={27}
              color="#00A8E8"
            />
          </View>

          <View style={styles.uploadInfo}>
            <Text style={[styles.uploadTitle, dark && { color: '#F2F6FF' }]}>
              Upload a file
            </Text>

            <Text style={[styles.uploadDescription, dark && { color: '#AAB7CC' }]}>
              PDF and document support will be connected later.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#BBBBBB"
          />
        </Pressable>

        <Pressable style={[styles.cameraCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]} onPress={() => router.push(`/reviewer/${reviewerId}/quick-capture`)}>
          <View style={styles.cameraIcon}>
            <Ionicons
              name="camera-outline"
              size={27}
              color="#D79A00"
            />
          </View>

          <View style={styles.uploadInfo}>
            <Text style={[styles.uploadTitle, dark && { color: '#F2F6FF' }]}>
              Scan handwritten notes
            </Text>

            <Text style={[styles.uploadDescription, dark && { color: '#AAB7CC' }]}>
              Open Quick Capture to type notes. Camera OCR is not available yet.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#BBBBBB"
          />
        </Pressable>

        <View style={[styles.tipCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
          <Ionicons name="bulb-outline" size={25} color="#E2A700" />

          <View style={styles.tipContent}>
            <Text style={[styles.tipTitle, dark && { color: '#F2F6FF' }]}>
              Study tip
            </Text>

            <Text style={[styles.tipText, dark && { color: '#AAB7CC' }]}>
              Clear and organized notes make it easier to
              create useful quizzes and flashcards.
            </Text>
          </View>
        </View>
        {materialId && <Pressable onPress={confirmDelete} style={{ padding: 15, alignItems: 'center' }} accessibilityRole="button"><Text style={{ color: '#D9534F', fontWeight: '800' }}>DELETE MATERIAL</Text></Pressable>}
      </ScrollView>

      <View style={[styles.bottom, dark && { backgroundColor: '#0B1220', borderTopColor: '#2B3A52' }]}>
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
            {materialId ? 'SAVE CHANGES' : 'SAVE MATERIAL'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FF',
  },

  header: {
    height: 64,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE5F2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F4F7FC',
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
    backgroundColor: '#EAF2FF',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  title: {
    fontSize: 23,
    fontWeight: '900',
    color: '#15264B',
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
    borderColor: '#DCE5F2',
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
    color: '#15264B',
  },

  notesContainer: {
    minHeight: 190,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 17,
    padding: 15,
  },

  notesInput: {
    minHeight: 145,
    fontSize: 15,
    lineHeight: 22,
    color: '#15264B',
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
    borderColor: '#DCE5F2',
    borderRadius: 17,
    padding: 14,
    marginBottom: 10,
  },

  cameraCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 17,
    padding: 14,
  },

  uploadIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#E5F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  cameraIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#FFF5D6',
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
    color: '#15264B',
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
    borderTopColor: '#DCE5F2',
    paddingHorizontal: 22,
    paddingVertical: 14,
  },

  saveButton: {
    width: '100%',
    maxWidth: 556,
    alignSelf: 'center',
    height: 57,
    backgroundColor: '#2563EB',
    borderRadius: 17,
    borderBottomWidth: 4,
    borderBottomColor: '#1748BA',
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
