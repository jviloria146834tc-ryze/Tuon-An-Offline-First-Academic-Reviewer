import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { initializeDatabase, seedReviewers } from '../database/database';
import { initializeFirebase } from '../firebase';

type StartupState = 'loading' | 'ready' | 'error';

export default function RootLayout() {
  const [state, setState] = useState<StartupState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const prepareApp = useCallback(async () => {
    await initializeDatabase();
    await seedReviewers();
    // Setup is local-only. Missing Firebase env values leave Firestore
    // disabled without preventing offline SQLite use.
    try {
      initializeFirebase();
    } catch (error) {
      console.warn('Firebase is not ready; SQLite remains available offline.', error);
    }
  }, []);

  useEffect(() => {
    let active = true;
    prepareApp()
      .then(() => { if (active) setState('ready'); })
      .catch(error => {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : 'Unknown database error');
        setState('error');
      });
    return () => { active = false; };
  }, [prepareApp]);

  const retry = () => {
    setState('loading');
    setErrorMessage('');
    prepareApp()
      .then(() => setState('ready'))
      .catch(error => {
        setErrorMessage(error instanceof Error ? error.message : 'Unknown database error');
        setState('error');
      });
  };

  if (state === 'loading') {
    return (
      <View style={styles.startup}>
        <ActivityIndicator size="large" color="#58CC02" />
        <Text style={styles.message}>Preparing your offline library…</Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.startup}>
        <Text style={styles.errorTitle}>TUON could not open its local database</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        <Pressable style={styles.retryButton} onPress={retry}>
          <Text style={styles.retryText}>TRY AGAIN</Text>
        </Pressable>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  startup: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F7F9F7' },
  message: { marginTop: 14, color: '#666666', fontSize: 14 },
  errorTitle: { color: '#292929', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  errorMessage: { marginTop: 8, color: '#777777', textAlign: 'center' },
  retryButton: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, backgroundColor: '#58CC02' },
  retryText: { color: '#FFFFFF', fontWeight: '900' },
});
