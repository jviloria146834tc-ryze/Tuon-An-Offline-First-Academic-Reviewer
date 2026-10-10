import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
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

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import {
  createMaterial,
  deleteMaterial,
  getMaterialById,
  updateMaterial,
} from '../../../database/materials';
import { getQuickCapturesByReviewer } from '../../../database/activity';
import { useAppTheme } from '../../../utils/ThemeContext';
import { extractDocumentNotesWithGemini } from '../../../utils/gemini';

export type AttachedFile = {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'doc' | 'text';
  uri?: string;
  size?: number | string;
  mimeType?: string;
  extractedText?: string;
};

export default function AddMaterialScreen() {
  const { dark } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewerId = Array.isArray(id) ? id[0] : id;
  const materialParam = useLocalSearchParams<{ materialId?: string }>().materialId;
  const materialId = Array.isArray(materialParam) ? materialParam[0] : materialParam;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  // File Preview Modal State
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [activePreview, setActivePreview] = useState<AttachedFile | null>(null);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (!materialId) return;
    getMaterialById(materialId)
      .then(async material => {
        if (!material) return;
        setTitle(material.title);
        setContent(material.content ?? '');

        // 1. Check if material has stored attachments JSON
        if (material.attachments) {
          try {
            const parsed = JSON.parse(material.attachments);
            if (Array.isArray(parsed)) {
              if (parsed.length > 0 && typeof parsed[0] === 'string') {
                // String array of photo URIs
                const photoFiles: AttachedFile[] = parsed.map((uri: string, idx: number) => ({
                  id: `photo-${idx}`,
                  name: `Capture Photo ${idx + 1}`,
                  type: 'image',
                  uri,
                }));
                setAttachments(photoFiles);
              } else {
                setAttachments(parsed);
              }
              return;
            }
          } catch {}
        }

        // 2. If it was created from quick-capture without attachments column, fallback to quick_captures
        if (reviewerId) {
          try {
            const captures = await getQuickCapturesByReviewer(reviewerId);
            const matching = captures.find(
              c => c.title === material.title || c.content === material.content
            );
            if (matching?.images) {
              const imageUris = JSON.parse(matching.images);
              if (Array.isArray(imageUris) && imageUris.length > 0) {
                const photoFiles: AttachedFile[] = imageUris.map((uri: string, idx: number) => ({
                  id: `capture-${idx}`,
                  name: `Photo Capture ${idx + 1}`,
                  type: 'image',
                  uri,
                }));
                setAttachments(photoFiles);
              }
            }
          } catch {}
        }
      })
      .catch(error => Alert.alert('Could not load material', String(error)));
  }, [materialId, reviewerId]);

  // Read file data safely across Android and native builds
  const readFileData = async (fileAsset: DocumentPicker.DocumentPickerAsset, asBase64: boolean): Promise<string> => {
    // 1. Modern File class
    try {
      const modernFile = new ExpoFile(fileAsset.uri);
      if (asBase64) return await modernFile.base64();
      return await modernFile.text();
    } catch {}

    // 2. Fetch blob reader
    try {
      const response = await fetch(fileAsset.uri);
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            if (asBase64) {
              const base64Index = reader.result.indexOf(';base64,');
              resolve(base64Index !== -1 ? reader.result.slice(base64Index + 8) : reader.result);
            } else {
              resolve(reader.result);
            }
          } else {
            reject(new Error('FileReader returned empty result.'));
          }
        };
        reader.onerror = () => reject(new Error('FileReader error reading file.'));
        if (asBase64) reader.readAsDataURL(blob);
        else reader.readAsText(blob);
      });
    } catch {}

    // 3. Legacy FileSystem
    const dest = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}${Date.now()}_${fileAsset.name}`;
    try {
      await FileSystem.copyAsync({ from: fileAsset.uri, to: dest });
      const content = await FileSystem.readAsStringAsync(dest, {
        encoding: asBase64 ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
      });
      void FileSystem.deleteAsync(dest, { idempotent: true });
      return content;
    } catch {
      return await FileSystem.readAsStringAsync(fileAsset.uri, {
        encoding: asBase64 ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
      });
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'text/plain',
          'text/markdown',
          'application/json',
          'text/csv',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileAsset = result.assets[0];
      const fileName = fileAsset.name || 'Document';
      const isPdf = fileName.toLowerCase().endsWith('.pdf');
      const isDoc = fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc');
      const mimeType = fileAsset.mimeType || (isPdf ? 'application/pdf' : 'text/plain');

      setImporting(true);

      // Auto-populate title if empty
      if (!title.trim()) {
        const cleanName = fileName.replace(/\.[^/.]+$/, '');
        setTitle(cleanName);
      }

      let extractedPreviewText = '';

      if (isPdf) {
        try {
          const base64Content = await readFileData(fileAsset, true);
          extractedPreviewText = await extractDocumentNotesWithGemini(base64Content, 'application/pdf');
        } catch {
          extractedPreviewText = 'Could not automatically transcribe PDF notes with Gemini. You can view document information or enter notes manually.';
        }
      } else if (!isDoc) {
        try {
          extractedPreviewText = await readFileData(fileAsset, false);
        } catch {}
      } else {
        extractedPreviewText = 'Word Document (.docx) attached. You can preview its details or transcribe study notes in the notes section.';
      }

      const newAttachment: AttachedFile = {
        id: `file-${Date.now()}`,
        name: fileName,
        type: isPdf ? 'pdf' : isDoc ? 'doc' : 'text',
        uri: fileAsset.uri,
        size: fileAsset.size ? `${Math.round(fileAsset.size / 1024)} KB` : undefined,
        mimeType,
        extractedText: extractedPreviewText,
      };

      setAttachments(prev => [...prev, newAttachment]);

      // If the content is currently empty, provide extracted study text automatically for convenience
      if (!content.trim() && extractedPreviewText && !isDoc) {
        setContent(extractedPreviewText);
      }

      Alert.alert('File Attached', `${fileName} is attached to this study material. You can tap it to preview anytime.`);
    } catch (error) {
      Alert.alert('Import Failed', error instanceof Error ? error.message : 'Could not attach the file.');
    } finally {
      setImporting(false);
    }
  };

  const handleAddPhotos = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please enable photo access to attach photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhotoAttachments: AttachedFile[] = result.assets.map((asset, idx) => ({
          id: `img-${Date.now()}-${idx}`,
          name: asset.fileName || `Photo ${attachments.length + idx + 1}`,
          type: 'image',
          uri: asset.uri,
          size: asset.fileSize ? `${Math.round(asset.fileSize / 1024)} KB` : undefined,
        }));
        setAttachments(prev => [...prev, ...newPhotoAttachments]);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Could not add photos.');
    }
  };

  const removeAttachment = (idToRemove: string) => {
    setAttachments(prev => prev.filter(item => item.id !== idToRemove));
  };

  const openPreview = (file: AttachedFile) => {
    if (file.type === 'image' && file.uri) {
      setPreviewImageUri(file.uri);
    } else {
      setActivePreview(file);
      setPreviewModalVisible(true);
    }
  };

  const saveMaterial = async () => {
    if (!reviewerId || !title.trim() || saving) return;
    setSaving(true);
    try {
      const infoParts: string[] = [];
      if (attachments.length > 0) {
        infoParts.push(`${attachments.length} attachment${attachments.length > 1 ? 's' : ''}`);
      }
      if (content.trim()) {
        infoParts.push(`${content.trim().length} chars`);
      }

      const input = {
        reviewer_id: reviewerId,
        title,
        content,
        info: infoParts.join(' • ') || 'Study Material',
        attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
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
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMaterial(materialId);
            router.back();
          } catch (error) {
            Alert.alert('Could not delete material', error instanceof Error ? error.message : 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, dark && { backgroundColor: '#0B1220' }]}>
      {/* HEADER */}
      <View style={[styles.header, dark && { backgroundColor: '#111B2B', borderBottomColor: '#2B3A52' }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={dark ? '#F2F6FF' : '#15264B'} />
        </Pressable>

        <Text style={[styles.headerTitle, dark && { color: '#F2F6FF' }]}>
          {materialId ? 'Edit Study Material' : 'Add Study Material'}
        </Text>

        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroIcon, dark && { backgroundColor: '#172235' }]}>
          <Ionicons name="document-text-outline" size={32} color="#2563EB" />
        </View>

        <Text style={[styles.title, dark && { color: '#F2F6FF' }]}>
          {materialId ? 'Study Material' : 'Add something to study'}
        </Text>

        <Text style={[styles.subtitle, dark && { color: '#AAB7CC' }]}>
          Preview photos, PDFs, documents, or manage your review notes.
        </Text>

        {/* MATERIAL TITLE */}
        <Text style={[styles.label, dark && { color: '#AAB7CC' }]}>MATERIAL TITLE</Text>
        <View style={[styles.inputContainer, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
          <Ionicons name="create-outline" size={20} color="#999999" />
          <TextInput
            style={[styles.input, dark && { color: '#F2F6FF' }]}
            placeholder="e.g. Introduction to Networking"
            placeholderTextColor="#AAAAAA"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* ATTACHMENTS & PREVIEW SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }, dark && { color: '#AAB7CC' }]}>
            ATTACHED FILES & PREVIEW ({attachments.length})
          </Text>
        </View>

        {attachments.length > 0 ? (
          <View style={styles.attachmentsList}>
            {attachments.map(file => {
              const isImg = file.type === 'image';
              const isPdf = file.type === 'pdf';
              const isDoc = file.type === 'doc';

              return (
                <View
                  key={file.id}
                  style={[styles.attachmentCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}
                >
                  <Pressable style={styles.attachmentLeft} onPress={() => openPreview(file)}>
                    {isImg && file.uri ? (
                      <Image source={{ uri: file.uri }} style={styles.previewThumb} />
                    ) : (
                      <View
                        style={[
                          styles.fileIconBadge,
                          isPdf && { backgroundColor: '#FEE2E2' },
                          isDoc && { backgroundColor: '#E0E7FF' },
                          !isPdf && !isDoc && { backgroundColor: '#E2E8F0' },
                        ]}
                      >
                        <Ionicons
                          name={isPdf ? 'document-text' : isDoc ? 'document' : 'document-outline'}
                          size={24}
                          color={isPdf ? '#DC2626' : isDoc ? '#2563EB' : '#475569'}
                        />
                      </View>
                    )}

                    <View style={styles.fileDetails}>
                      <Text style={[styles.fileName, dark && { color: '#F2F6FF' }]} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={[styles.fileMeta, dark && { color: '#AAB7CC' }]}>
                        {file.type.toUpperCase()}{file.size ? ` • ${file.size}` : ''} • Tap to Preview
                      </Text>
                    </View>
                  </Pressable>

                  <View style={styles.attachmentActions}>
                    <Pressable
                      style={styles.previewBtnBadge}
                      onPress={() => openPreview(file)}
                      accessibilityLabel="Preview file"
                    >
                      <Ionicons name="eye-outline" size={18} color="#2563EB" />
                    </Pressable>

                    <Pressable
                      style={styles.removeBtnBadge}
                      onPress={() => removeAttachment(file.id)}
                      accessibilityLabel="Remove file"
                    >
                      <Ionicons name="close" size={18} color="#DC2626" />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyAttachBox, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
            <Ionicons name="folder-open-outline" size={28} color="#94A3B8" />
            <Text style={[styles.emptyAttachText, dark && { color: '#94A3B8' }]}>
              No files attached yet. Upload a document or photos to preview them here.
            </Text>
          </View>
        )}

        {/* ATTACHMENT ACTION BUTTONS */}
        <View style={styles.quickAddRow}>
          <Pressable
            style={[styles.quickAddBtn, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}
            onPress={handleFileUpload}
            disabled={importing}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#00A8E8" />
            <Text style={[styles.quickAddText, { color: '#00A8E8' }]}>
              {importing ? 'Processing...' : 'Upload PDF / Docs'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.quickAddBtn, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}
            onPress={handleAddPhotos}
          >
            <Ionicons name="images-outline" size={20} color="#D79A00" />
            <Text style={[styles.quickAddText, { color: '#D79A00' }]}>Attach Photos</Text>
          </Pressable>
        </View>

        {/* STUDY NOTES */}
        <Text style={[styles.label, dark && { color: '#AAB7CC' }]}>STUDY NOTES</Text>
        <View style={[styles.notesContainer, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
          <TextInput
            style={[styles.notesInput, dark && { color: '#F2F6FF' }]}
            multiline
            textAlignVertical="top"
            placeholder="Type or paste your study notes, formulas, or summaries here..."
            placeholderTextColor="#AAAAAA"
            value={content}
            onChangeText={setContent}
          />

          <Text style={[styles.characterCount, dark && { color: '#AAB7CC' }]}>
            {content.length} characters
          </Text>
        </View>

        {/* STUDY TIP */}
        <View style={[styles.tipCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
          <Ionicons name="bulb-outline" size={24} color="#E2A700" />
          <View style={styles.tipContent}>
            <Text style={[styles.tipTitle, dark && { color: '#F2F6FF' }]}>Study tip</Text>
            <Text style={[styles.tipText, dark && { color: '#AAB7CC' }]}>
              Attached documents and photos remain previewable anytime. Quiz and flashcard generators will use your study notes as primary source material.
            </Text>
          </View>
        </View>

        {materialId && (
          <Pressable onPress={confirmDelete} style={styles.deleteButton} accessibilityRole="button">
            <Text style={styles.deleteButtonText}>DELETE MATERIAL</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* SAVE FOOTER */}
      <View style={[styles.bottom, dark && { backgroundColor: '#0B1220', borderTopColor: '#2B3A52' }]}>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.buttonPressed,
            (!title.trim() || saving) && styles.disabled,
          ]}
          disabled={!title.trim() || saving}
          onPress={saveMaterial}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <Text style={styles.saveText}>{saving ? 'SAVING...' : 'SAVE MATERIAL'}</Text>
        </Pressable>
      </View>

      {/* FULLSCREEN IMAGE PREVIEW MODAL */}
      <Modal visible={Boolean(previewImageUri)} transparent animationType="fade">
        <View style={styles.imageModalOverlay}>
          <Pressable style={styles.modalCloseBtn} onPress={() => setPreviewImageUri(null)}>
            <Ionicons name="close-circle" size={38} color="#FFF" />
          </Pressable>
          {previewImageUri && (
            <Image source={{ uri: previewImageUri }} style={styles.modalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* DOCUMENT PREVIEW MODAL */}
      <Modal visible={previewModalVisible} transparent animationType="slide">
        <View style={styles.docModalOverlay}>
          <View style={[styles.docModalContent, dark && { backgroundColor: '#111B2B', borderColor: '#2B3A52' }]}>
            <View style={[styles.docModalHeader, dark && { borderBottomColor: '#2B3A52' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.docModalTitle, dark && { color: '#F2F6FF' }]} numberOfLines={1}>
                  {activePreview?.name}
                </Text>
                <Text style={[styles.docModalSubtitle, dark && { color: '#AAB7CC' }]}>
                  {activePreview?.type.toUpperCase()} PREVIEW
                </Text>
              </View>

              <Pressable onPress={() => setPreviewModalVisible(false)} style={styles.docModalClose}>
                <Ionicons name="close" size={24} color={dark ? '#F2F6FF' : '#15264B'} />
              </Pressable>
            </View>

            <ScrollView style={styles.docModalBody}>
              {activePreview?.extractedText ? (
                <Text style={[styles.docModalText, dark && { color: '#E2E8F0' }]}>
                  {activePreview.extractedText}
                </Text>
              ) : (
                <View style={styles.docEmptyState}>
                  <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
                  <Text style={[styles.docEmptyText, dark && { color: '#94A3B8' }]}>
                    No text preview available for this file type.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles.docModalFooter, dark && { borderTopColor: '#2B3A52' }]}>
              <Pressable
                style={styles.docDoneBtn}
                onPress={() => setPreviewModalVisible(false)}
              >
                <Text style={styles.docDoneText}>DONE</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FF',
  },
  header: {
    height: 60,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DCE5F2',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15264B',
  },
  placeholder: {
    width: 36,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#15264B',
    textAlign: 'center',
    marginTop: 14,
  },
  subtitle: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DCE5F2',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#15264B',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  attachmentsList: {
    gap: 10,
    marginBottom: 10,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DCE5F2',
    borderRadius: 14,
    padding: 10,
  },
  attachmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  previewThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#000',
  },
  fileIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15264B',
  },
  fileMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  attachmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewBtnBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAttachBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyAttachText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 6,
  },
  quickAddBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DCE5F2',
    borderRadius: 12,
    gap: 8,
  },
  quickAddText: {
    fontSize: 12,
    fontWeight: '800',
  },
  notesContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DCE5F2',
    borderRadius: 14,
    padding: 14,
    minHeight: 180,
  },
  notesInput: {
    flex: 1,
    minHeight: 140,
    fontSize: 14,
    lineHeight: 22,
    color: '#15264B',
  },
  characterCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 8,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E8',
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
    gap: 12,
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#7D6500',
  },
  tipText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#8C7B3E',
    marginTop: 2,
  },
  deleteButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: '#D9534F',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.6,
  },
  bottom: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#DCE5F2',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  saveButton: {
    height: 54,
    backgroundColor: '#2563EB',
    borderRadius: 14,
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
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
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
    width: '92%',
    height: '82%',
  },
  docModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  docModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  docModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#15264B',
  },
  docModalSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 2,
  },
  docModalClose: {
    padding: 4,
  },
  docModalBody: {
    padding: 18,
  },
  docModalText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#15264B',
  },
  docEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  docEmptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  docModalFooter: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  docDoneBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  docDoneText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.6,
  },
});
