import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { router } from 'expo-router';
import { loginWithEmail, registerWithEmail, getCurrentAuthUser } from '../firebase/auth';
import { performSync } from '../firebase/sync';
import { COLORS } from '../utils/theme';

export default function AuthenticationScreen() {
  const [activeTab, setActiveTab] =
    useState<'login' | 'register'>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // If user is already authenticated, allow instant navigation
    const currentUser = getCurrentAuthUser();
    if (currentUser) {
      router.replace('/(tabs)/dashboard');
    }
  }, []);

  const handleSubmit = async () => {
    setErrorMessage('');
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'login') {
        const res = await loginWithEmail(email, password);
        if (res.success) {
          performSync().catch(() => {});
          router.replace('/(tabs)/dashboard');
        } else {
          setErrorMessage(res.error || 'Login failed. Please check your credentials.');
        }
      } else {
        const res = await registerWithEmail(email, password, name);
        if (res.success) {
          performSync().catch(() => {});
          router.replace('/(tabs)/dashboard');
        } else {
          setErrorMessage(res.error || 'Registration failed.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* LOGO */}
          <View style={styles.brandContainer}>
            <Image source={require('../assets/tuon-logo.png')} style={styles.logo} resizeMode="cover" accessibilityLabel="TUON logo" />

            <Text style={styles.appName}>TUON</Text>

            <Text style={styles.tagline}>
              Learn smarter, even offline.
            </Text>
          </View>

          {/* LOGIN / REGISTER */}
          <View style={styles.tabContainer}>
            <Pressable
              style={[
                styles.tab,
                activeTab === 'login' && styles.activeTab,
              ]}
              onPress={() => {
                setActiveTab('login');
                setErrorMessage('');
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'login' &&
                    styles.activeTabText,
                ]}
              >
                Log In
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.tab,
                activeTab === 'register' &&
                  styles.activeTab,
              ]}
              onPress={() => {
                setActiveTab('register');
                setErrorMessage('');
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'register' &&
                    styles.activeTabText,
                ]}
              >
                Register
              </Text>
            </Pressable>
          </View>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* FORM */}
          <View style={styles.form}>
            {activeTab === 'register' && (
              <>
                <Text style={styles.label}>
                  FULL NAME
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Juan dela Cruz"
                  placeholderTextColor="#A0A0A0"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </>
            )}

            <Text style={styles.label}>
              EMAIL ADDRESS
            </Text>

            <TextInput
              style={styles.input}
              placeholder="you@university.edu"
              placeholderTextColor="#A0A0A0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <Text style={styles.label}>
              PASSWORD
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#A0A0A0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            {/* MAIN BUTTON */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {activeTab === 'login'
                    ? 'Log In'
                    : 'Create Account'}
                </Text>
              )}
            </Pressable>

          </View>

          {/* OFFLINE MESSAGE */}
          <View style={styles.footer}>
            <Text style={styles.footerTitle}>
              Study anywhere, even offline.
            </Text>

            <Text style={styles.footerText}>
              Your reviewers stay available even when
              you&apos;re offline.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FF',
  },

  container: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 22,
    justifyContent: 'center',
  },

  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },

  logo: {
    width: 92,
    height: 92,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.gold,
    marginBottom: 16,
  },

  appName: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.navy,
    letterSpacing: 1,
  },

  tagline: {
    marginTop: 6,
    fontSize: 15,
    color: '#777777',
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E9ECE9',
    borderRadius: 16,
    padding: 5,
    marginBottom: 26,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },

  activeTab: {
    backgroundColor: '#FFFFFF',
  },

  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#929292',
  },

  activeTabText: {
    color: '#15264B',
  },

  form: {
    width: '100%',
  },

  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#666666',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 2,
  },

  input: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 15,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#15264B',
    marginBottom: 20,
  },

  primaryButton: {
    height: 56,
    backgroundColor: COLORS.blue,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: COLORS.blueDark,
    marginTop: 4,
  },

  buttonPressed: {
    transform: [{ translateY: 2 }],
    borderBottomWidth: 2,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  errorContainer: {
    backgroundColor: '#FDECEA',
    borderWidth: 1,
    borderColor: '#F5C2C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },

  errorBannerText: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  footer: {
    marginTop: 34,
    alignItems: 'center',
  },

  footerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#15264B',
  },

  footerText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#888888',
    textAlign: 'center',
    maxWidth: 310,
  },
});
