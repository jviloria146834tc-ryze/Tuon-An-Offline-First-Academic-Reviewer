import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { router } from 'expo-router';

export default function AuthenticationScreen() {
  const [activeTab, setActiveTab] =
    useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (activeTab === 'login') {
      // Temporary navigation.
      // Firebase authentication will be added later.
      router.replace('/(tabs)/dashboard');
    } else {
      // Registration functionality will be added later.
      console.log('Register:', email);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>

          {/* LOGO */}
          <View style={styles.brandContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoLetter}>T</Text>
            </View>

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
              onPress={() => setActiveTab('login')}
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
              onPress={() => setActiveTab('register')}
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

          {/* FORM */}
          <View style={styles.form}>
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
            />

            {/* MAIN BUTTON */}
            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {activeTab === 'login'
                  ? 'Log In'
                  : 'Create Account'}
              </Text>
            </Pressable>
          </View>

          {/* OFFLINE MESSAGE */}
          <View style={styles.footer}>
            <Text style={styles.footerTitle}>
              Study anywhere. 🌱
            </Text>

            <Text style={styles.footerText}>
              Your reviewers stay available even when
              you're offline.
            </Text>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9F7',
  },

  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },

  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },

  logo: {
    width: 82,
    height: 82,
    borderRadius: 24,
    backgroundColor: '#58CC02',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  logoLetter: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
  },

  appName: {
    fontSize: 34,
    fontWeight: '900',
    color: '#202124',
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
    color: '#202124',
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
    borderColor: '#E2E5E2',
    borderRadius: 15,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#202124',
    marginBottom: 20,
  },

  primaryButton: {
    height: 56,
    backgroundColor: '#58CC02',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#46A302',
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

  footer: {
    marginTop: 34,
    alignItems: 'center',
  },

  footerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3C3C3C',
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