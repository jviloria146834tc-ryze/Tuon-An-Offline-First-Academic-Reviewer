import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
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
import { Ionicons } from '@expo/vector-icons';
import {
  loginWithEmail,
  registerWithEmail,
  getCurrentAuthUser,
  checkHasActiveSession,
  subscribeToAuthState,
} from '../firebase/auth';
import { performSync } from '../firebase/sync';
import { COLORS } from '../utils/theme';

export default function AuthenticationScreen() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] =
    useState<'login' | 'register'>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
    passwordRef.current?.focus();
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev);
    confirmPasswordRef.current?.focus();
  };

  useEffect(() => {
    let active = true;

    // 1. Instant check: If Firebase already has currentUser synchronously
    const immediateUser = getCurrentAuthUser();
    if (immediateUser) {
      router.replace('/(tabs)/dashboard');
      return;
    }

    // 2. Offline / Local session check (from SQLite active_student_id)
    void checkHasActiveSession().then((hasSession) => {
      if (!active) return;
      if (hasSession) {
        router.replace('/(tabs)/dashboard');
      } else {
        setCheckingAuth(false);
      }
    });

    // 3. Firebase Auth listener (in case credentials restore asynchronously from AsyncStorage)
    const unsubscribe = subscribeToAuthState((user) => {
      if (!active) return;
      if (user) {
        router.replace('/(tabs)/dashboard');
      }
    });

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardOpen(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardOpen(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => {
      active = false;
      unsubscribe();
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSubmit = async () => {
    setErrorMessage('');
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    if (activeTab === 'register') {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (!confirmPassword.trim()) {
        setErrorMessage('Please retype your password.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please retype carefully.');
        return;
      }
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

  if (checkingAuth) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.blue} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            isKeyboardOpen && styles.contentKeyboardOpen,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* LOGO */}
          <View style={[styles.brandContainer, isKeyboardOpen && styles.brandContainerCompact]}>
            <Image source={require('../assets/tuon-logo.png')} style={[styles.logo, isKeyboardOpen && styles.logoCompact]} resizeMode="cover" accessibilityLabel="TUON logo" />

            <Text style={styles.appName}>TUON</Text>

            <Text style={styles.tagline}>
              Learn smarter, even when offline.
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
                setConfirmPassword('');
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
                setConfirmPassword('');
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
                  autoCorrect={false}
                  keyboardType="default"
                  autoComplete="name"
                  textContentType="name"
                  importantForAutofill="no"
                  onFocus={() => {
                    scrollRef.current?.scrollTo({ y: 50, animated: true });
                  }}
                />
              </>
            )}

            <Text style={styles.label}>
              EMAIL ADDRESS
            </Text>

            <TextInput
              style={styles.input}
              placeholder="you@email.com"
              placeholderTextColor="#A0A0A0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              onFocus={() => {
                scrollRef.current?.scrollTo({ y: 110, animated: true });
              }}
            />

            <Text style={styles.label}>
              PASSWORD
            </Text>

            <View style={styles.passwordContainer}>
              <TextInput
                ref={passwordRef}
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#A0A0A0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="oneTimeCode"
                autoComplete="off"
                cursorColor="#15264B"
                selectionColor="#15264B"
                blurOnSubmit={false}
                onFocus={() => {
                  scrollRef.current?.scrollTo({ y: activeTab === 'register' ? 220 : 160, animated: true });
                }}
              />
              <Pressable
                style={styles.eyeButton}
                onPress={togglePasswordVisibility}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={21}
                  color="#78859B"
                />
              </Pressable>
            </View>

            {activeTab === 'register' && (
              <>
                <Text style={styles.label}>
                  RETYPE PASSWORD
                </Text>

                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={confirmPasswordRef}
                    style={styles.passwordInput}
                    placeholder="Retype your password"
                    placeholderTextColor="#A0A0A0"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="oneTimeCode"
                    autoComplete="off"
                    cursorColor="#15264B"
                    selectionColor="#15264B"
                    blurOnSubmit={false}
                    onFocus={() => {
                      scrollRef.current?.scrollTo({ y: 280, animated: true });
                    }}
                  />
                  <Pressable
                    style={styles.eyeButton}
                    onPress={toggleConfirmPasswordVisibility}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={21}
                      color="#78859B"
                    />
                  </Pressable>
                </View>
              </>
            )}

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

          {/* FOOTER */}
          <View style={styles.footer}>
            <Pressable
              onPress={() => {
                setActiveTab(activeTab === 'login' ? 'register' : 'login');
                setErrorMessage('');
                setConfirmPassword('');
              }}
              style={styles.switchPrompt}
              hitSlop={8}
            >
              <Text style={styles.switchPromptText}>
                {activeTab === 'login'
                  ? "Don't have an account? "
                  : 'Already have an account? '}
                <Text style={styles.switchPromptLink}>
                  {activeTab === 'login' ? 'Register' : 'Log In'}
                </Text>
              </Text>
            </Pressable>

            <View style={styles.secureNotice}>
              <Text style={styles.secureNoticeText}>
                By continuing, you agree to TUON’s Terms & Privacy Policy.
              </Text>
            </View>
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

  contentKeyboardOpen: {
    justifyContent: 'flex-start',
    paddingBottom: 90,
  },

  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },

  brandContainerCompact: {
    marginBottom: 16,
  },

  logo: {
    width: 92,
    height: 92,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.gold,
    marginBottom: 16,
  },

  logoCompact: {
    width: 58,
    height: 58,
    borderRadius: 16,
    marginBottom: 10,
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

  passwordContainer: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DCE5F2',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#15264B',
  },

  eyeButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },

  switchPrompt: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  switchPromptText: {
    fontSize: 14,
    color: '#6B7A99',
    fontWeight: '500',
  },

  switchPromptLink: {
    color: COLORS.blue,
    fontWeight: '700',
  },

  secureNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  secureNoticeText: {
    fontSize: 12,
    color: '#8A97AC',
    fontWeight: '500',
    textAlign: 'center',
  },
});
