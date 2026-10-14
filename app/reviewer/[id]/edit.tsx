import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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
import { getReviewerById, updateReviewer, REVIEWER_ICONS } from '../../../database/reviewers';
import { useAppTheme } from '../../../utils/ThemeContext';

export default function EditReviewerScreen() {
  const { dark } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const reviewerId = Array.isArray(id) ? id[0] : id;
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('book-outline');
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
      setSelectedIcon(reviewer.icon || 'book-outline');
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
      await updateReviewer(reviewerId, { name, subject, description, icon: selectedIcon });
      router.replace(`/reviewer/${reviewerId}`);
    } catch (error) {
      Alert.alert('Could not save changes', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, dark && { backgroundColor: '#0B1220' }]}>
      <View style={[styles.header, dark && { backgroundColor: '#111B2B', borderBottomColor: '#2B3A52' }]}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            dark && { backgroundColor: '#172235', borderColor: '#2B3A52' },
            pressed && (dark ? { backgroundColor: '#1E2D44' } : { backgroundColor: '#EBF2FE' }),
          ]}
          onPress={() => router.replace(`/reviewer/${reviewerId}`)}
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
          Edit Reviewer
        </Text>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.heroIcon, dark && { backgroundColor: '#172235' }]}>
          <Ionicons
            name={selectedIcon as any}
            size={32}
            color="#2563EB"
          />
        </View>

        <Text style={[styles.title, dark && { color: '#F2F6FF' }]}>
          Reviewer details
        </Text>

        <Text style={[styles.subtitle, dark && { color: '#AAB7CC' }]}>
          Update the information for this reviewer.
        </Text>

        <Text style={[styles.label, dark && { color: '#AAB7CC' }]}>
          REVIEWER NAME
        </Text>

        <View style={[styles.inputContainer, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
          <Ionicons
            name="book-outline"
            size={20}
            color="#999999"
          />

          <TextInput
            style={[styles.input, dark && { color: '#F2F6FF' }]}
            value={name}
            onChangeText={setName}
            placeholder="Reviewer name"
            placeholderTextColor="#AAAAAA"
          />
        </View>

        <Text style={[styles.label, dark && { color: '#AAB7CC' }]}>
          SUBJECT
        </Text>

        <View style={[styles.inputContainer, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
          <Ionicons
            name="school-outline"
            size={20}
            color="#999999"
          />

          <TextInput
            style={[styles.input, dark && { color: '#F2F6FF' }]}
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject"
            placeholderTextColor="#AAAAAA"
          />
        </View>

        <Text style={[styles.label, dark && { color: '#AAB7CC' }]}>
          DESCRIPTION
        </Text>

        <TextInput
          style={[styles.textArea, dark && { backgroundColor: '#172235', borderColor: '#2B3A52', color: '#F2F6FF' }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Add a short description..."
          placeholderTextColor="#AAAAAA"
          multiline
          textAlignVertical="top"
        />

        {/* CHOOSE AN ICON */}
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

        <View style={[styles.infoCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color="#00A8E8"
          />

          <Text style={[styles.infoText, dark && { color: '#AAB7CC' }]}>
            {loading ? 'Loading reviewer details...' : 'Changes are saved locally on this device.'}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.bottom, dark && { backgroundColor: '#0B1220', borderTopColor: '#2B3A52' }]}>
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
    backgroundColor: '#F4F7FF',
  },

  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE5F2',
    paddingHorizontal: 20,
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
    backgroundColor: '#EAF2FF',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  title: {
    textAlign: 'center',
    fontSize: 23,
    fontWeight: '900',
    color: '#15264B',
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
    borderColor: '#DCE5F2',
    borderRadius: 17,
    paddingHorizontal: 15,
    marginBottom: 22,
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#15264B',
  },

  textArea: {
    minHeight: 130,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 17,
    padding: 15,
    fontSize: 14,
    lineHeight: 21,
    color: '#15264B',
    marginBottom: 17,
  },

  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 18,
    padding: 10,
    marginBottom: 17,
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

  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E5F8FF',
    borderRadius: 17,
    padding: 15,
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 11,
    lineHeight: 17,
    color: '#365F82',
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
    borderRadius: 17,
    backgroundColor: '#2563EB',
    borderBottomWidth: 4,
    borderBottomColor: '#1748BA',
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
