import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { saveQuickCapture } from '../../../database/activity';
import { useAppTheme } from '../../../utils/ThemeContext';

const MAX_PHOTOS = 5;

export default function QuickCaptureScreen() {
  const { dark } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewerId = Array.isArray(id) ? id[0] : id;

  const [title, setTitle] = useState('Quick Notes');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const takePhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Limit Reached', `You can only store up to ${MAX_PHOTOS} photos per capture.`);
      return;
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access in your device settings to take study photos.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setPhotos(prev => [...prev, uri]);
      }
    } catch (error) {
      Alert.alert('Camera Error', error instanceof Error ? error.message : 'Could not launch camera.');
    }
  };

  const pickFromGallery = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Limit Reached', `You can only store up to ${MAX_PHOTOS} photos per capture.`);
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo Access Required',
          'Please allow photo library access in your settings to select photos.'
        );
        return;
      }

      const remainingSlots = MAX_PHOTOS - photos.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map(a => a.uri);
        setPhotos(prev => [...prev, ...newUris].slice(0, MAX_PHOTOS));
      }
    } catch (error) {
      Alert.alert('Gallery Error', error instanceof Error ? error.message : 'Could not open gallery.');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    const hasPhotos = photos.length > 0;
    const hasText = content.trim().length > 0;

    if (!reviewerId || (!hasPhotos && !hasText) || saving) {
      return;
    }

    setSaving(true);
    try {
      await saveQuickCapture(reviewerId, title, content, photos);
      router.back();
    } catch (error) {
      Alert.alert(
        'Could not save capture',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const canSave = (photos.length > 0 || content.trim().length > 0) && !saving;

  return (
    <SafeAreaView style={[styles.safe, dark && { backgroundColor: '#0B1220' }]}>
      {/* HEADER */}
      <View style={[styles.header, dark && { backgroundColor: '#111B2B', borderBottomColor: '#2B3A52' }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={dark ? '#F2F6FF' : '#15264B'} />
        </Pressable>
        <Text style={[styles.title, dark && { color: '#F2F6FF' }]}>Quick Capture</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="camera-outline" size={32} color="#D79A00" />
        </View>

        <Text style={[styles.heading, dark && { color: '#F2F6FF' }]}>Camera & Quick Notes</Text>
        <Text style={[styles.subtitle, dark && { color: '#AAB7CC' }]}>
          Snap photos of lecture boards, handouts, or notes (up to 5 per capture batch).
        </Text>

        {/* TITLE INPUT */}
        <Text style={[styles.label, dark && { color: '#AAB7CC' }]}>BATCH / NOTE TITLE</Text>
        <TextInput
          style={[styles.input, dark && { backgroundColor: '#172235', borderColor: '#2B3A52', color: '#F2F6FF' }]}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Chapter 4 Board Notes"
          placeholderTextColor={dark ? '#8998AE' : '#999'}
        />

        {/* PHOTO ATTACHMENTS (UP TO 5) */}
        <View style={styles.sectionRow}>
          <Text style={[styles.label, { marginBottom: 0 }, dark && { color: '#AAB7CC' }]}>
            CAPTURED PHOTOS ({photos.length}/{MAX_PHOTOS})
          </Text>
          {photos.length < MAX_PHOTOS && (
            <Text style={styles.photoRemaining}>
              {MAX_PHOTOS - photos.length} slot{MAX_PHOTOS - photos.length > 1 ? 's' : ''} left
            </Text>
          )}
        </View>

        <View style={styles.photoGrid}>
          {photos.map((uri, index) => (
            <View key={`${uri}-${index}`} style={[styles.photoCard, dark && { borderColor: '#2B3A52' }]}>
              <Pressable onPress={() => setPreviewImage(uri)} style={styles.photoPressable}>
                <Image source={{ uri }} style={styles.thumbnail} />
              </Pressable>
              <Pressable
                style={styles.deleteBadge}
                onPress={() => removePhoto(index)}
                accessibilityLabel="Remove photo"
              >
                <Ionicons name="close" size={14} color="#FFF" />
              </Pressable>
              <View style={styles.indexBadge}>
                <Text style={styles.indexText}>{index + 1}</Text>
              </View>
            </View>
          ))}

          {/* Add buttons if under limit */}
          {photos.length < MAX_PHOTOS && (
            <View style={styles.actionButtonsRow}>
              <Pressable
                style={[styles.addPhotoButton, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}
                onPress={takePhoto}
              >
                <Ionicons name="camera" size={24} color="#2563EB" />
                <Text style={styles.addPhotoText}>Take Photo</Text>
              </Pressable>

              <Pressable
                style={[styles.addPhotoButton, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}
                onPress={pickFromGallery}
              >
                <Ionicons name="images" size={24} color="#D79A00" />
                <Text style={[styles.addPhotoText, { color: '#D79A00' }]}>Gallery</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* OPTIONAL NOTES INPUT */}
        <Text style={[styles.label, dark && { color: '#AAB7CC' }]}>ACCOMPANYING NOTES (OPTIONAL)</Text>
        <TextInput
          style={[
            styles.input,
            styles.notesInput,
            dark && { backgroundColor: '#172235', borderColor: '#2B3A52', color: '#F2F6FF' },
          ]}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          placeholder="Add descriptions, summaries, or transcribed thoughts..."
          placeholderTextColor={dark ? '#8998AE' : '#999'}
        />

        {/* SAVE BUTTON */}
        <Pressable
          style={[styles.saveBtn, !canSave && styles.disabled]}
          disabled={!canSave}
          onPress={save}
        >
          <Ionicons name="save-outline" size={20} color="#FFF" />
          <Text style={styles.saveBtnText}>
            {saving ? 'SAVING CAPTURE...' : `SAVE CAPTURE (${photos.length} PHOTO${photos.length === 1 ? '' : 'S'})`}
          </Text>
        </Pressable>
      </ScrollView>

      {/* FULLSCREEN PREVIEW MODAL */}
      <Modal visible={Boolean(previewImage)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalCloseBtn} onPress={() => setPreviewImage(null)}>
            <Ionicons name="close-circle" size={36} color="#FFF" />
          </Pressable>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4F7FF',
  },
  header: {
    height: 60,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE5F2',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15264B',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFF5D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  heading: {
    fontSize: 22,
    fontWeight: '900',
    color: '#15264B',
    textAlign: 'center',
    marginTop: 14,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#777',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  photoRemaining: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#666',
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DCE5F2',
    borderRadius: 13,
    padding: 14,
    fontSize: 14,
    color: '#15264B',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 4,
  },
  photoCard: {
    width: 98,
    height: 98,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#000',
    position: 'relative',
  },
  photoPressable: {
    width: '100%',
    height: '100%',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  deleteBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(217, 83, 79, 0.9)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  indexText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 6,
  },
  addPhotoButton: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#B8CBE8',
    backgroundColor: '#F7FAFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  notesInput: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  disabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  modalImage: {
    width: '90%',
    height: '80%',
  },
});
