import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getActiveStudentId, getCurrentAuthUser, updateStudentDisplayName } from '../firebase/auth';
import { getDatabase } from '../database/database';
import { useAppTheme } from '../utils/ThemeContext';

export default function ProfileScreen() {
  const user = getCurrentAuthUser();
  const { dark } = useAppTheme();
  const [name, setName] = useState(user?.displayName || user?.email?.split('@')[0] || 'Local Student');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const id = await getActiveStudentId();
        const db = await getDatabase();
        const profile = await db.getFirstAsync<{ display_name: string | null }>(
          'SELECT display_name FROM students WHERE student_id = ?', id
        );
        if (active && profile?.display_name) setName(profile.display_name);
      } catch { /* Keep the Firebase or guest fallback name. */ }
    })();
    return () => { active = false; };
  }, []);
  const save = async () => {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter your name.'); return; }
    setSaving(true);
    try {
      await updateStudentDisplayName(name);
      Alert.alert('Profile saved', 'Your name has been updated on this device. Cloud profile changes will sync when available.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Could not save profile', error instanceof Error ? error.message : 'Please try again.');
    } finally { setSaving(false); }
  };
  return <SafeAreaView style={[styles.safe, dark && { backgroundColor: '#0B1220' }]}>
    <View style={styles.content}>
      <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={[styles.back, dark && { color: '#7CB0FF' }]}>‹  Settings</Text></Pressable>
      <Text style={[styles.title, dark && { color: '#F2F6FF' }]}>Personal Profile</Text>
      <Text style={[styles.help, dark && { color: '#AAB7CC' }]}>Update the name shown in TUON.</Text>
      <Text style={styles.label}>NAME</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={dark ? '#8090A8' : '#9BA6B8'} style={[styles.input, dark && { backgroundColor: '#172235', borderColor: '#2B3A52', color: '#F2F6FF' }]} autoCapitalize="words" returnKeyType="done" />
      <Text style={styles.label}>EMAIL</Text>
      <TextInput value={user?.email || 'Offline / Guest Mode'} editable={false} style={[styles.input, styles.readOnly, dark && { backgroundColor: '#172235', borderColor: '#2B3A52', color: '#AAB7CC' }]} />
      <Pressable onPress={save} disabled={saving} style={[styles.save, saving && { opacity: 0.65 }]}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save profile</Text>}
      </Pressable>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#F4F7FF' }, content: { padding: 22, flex: 1 }, back: { color: '#2563EB', fontWeight: '800', fontSize: 15, marginBottom: 28 }, title: { color: '#15264B', fontWeight: '900', fontSize: 26 }, help: { color: '#71809A', marginTop: 6, marginBottom: 30 }, label: { color: '#71809A', fontWeight: '800', fontSize: 11, letterSpacing: 1, marginBottom: 8, marginTop: 14 }, input: { backgroundColor: '#fff', color: '#15264B', borderWidth: 1, borderColor: '#DCE5F2', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15 }, readOnly: { color: '#71809A' }, save: { marginTop: 30, minHeight: 52, borderRadius: 14, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' }, saveText: { color: '#fff', fontWeight: '900', fontSize: 15 } });
