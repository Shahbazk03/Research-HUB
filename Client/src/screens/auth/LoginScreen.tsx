import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Animated, TouchableOpacity, Dimensions
} from 'react-native';
import { TextInput, Button, Text, useTheme, Snackbar } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import apiClient from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const { width } = Dimensions.get('window');

export const LoginScreen = ({ navigation }: { navigation: Nav }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login } = useContext(AuthContext);
  const theme = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true); setError('');
    try {
      const res = await apiClient.post('/auth/login', { email: email.toLowerCase(), password });
      if (res.data.success) {
        await login(res.data.data.token, res.data.data.user);
      } else {
        setError(res.data.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Cannot connect to server. Is it running?');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Gradient Background Decoration */}
      <View style={styles.bgDecoration1} />
      <View style={styles.bgDecoration2} />
      <View style={styles.bgDecoration3} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.logoSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🔬</Text>
          </View>
          <Text style={styles.appName}>Research Hub</Text>
          <Text style={styles.tagline}>Expert research, delivered to you</Text>
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }, { translateY: slideAnim }] }]}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your account</Text>

          <TextInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="email-outline" />}
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPass}
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="lock-outline" />}
            right={<TextInput.Icon icon={showPass ? 'eye-off' : 'eye'} onPress={() => setShowPass(!showPass)} />}
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Sign In
          </Button>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.secondaryButtonText}>Create a new account</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.trustRow, { opacity: fadeAnim }]}>
          {['🔒 Secure', '📋 Confidential', '⚡ Fast'].map(tag => (
            <View key={tag} style={styles.trustTag}>
              <Text style={styles.trustTagText}>{tag}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={4000}
        style={styles.snackbar} action={{ label: '✕', onPress: () => setError('') }}>
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  bgDecoration1: {
    position: 'absolute', top: -80, right: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: '#4338CA',
    opacity: 0.07,
  },
  bgDecoration2: {
    position: 'absolute', top: 120, left: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#7C3AED',
    opacity: 0.06,
  },
  bgDecoration3: {
    position: 'absolute', bottom: 100, right: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#10B981',
    opacity: 0.05,
  },
  scrollContent: {
    flexGrow: 1, justifyContent: 'center',
    padding: 24, paddingTop: 60,
  },
  logoSection: { alignItems: 'center', marginBottom: 36 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#4338CA',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  logoEmoji: { fontSize: 36 },
  appName: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1E1B4B',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: { fontSize: 15, color: '#64748B' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 8,
    marginBottom: 24,
  },
  cardTitle: { fontSize: 24, fontWeight: '800', color: '#1E1B4B', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 28 },
  input: { marginBottom: 16, backgroundColor: '#F8FAFC' },
  inputOutline: { borderRadius: 14, borderColor: '#E2E8F0' },
  button: {
    borderRadius: 14, backgroundColor: '#4338CA',
    marginTop: 8,
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonContent: { paddingVertical: 12 },
  buttonLabel: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F1F5F9' },
  dividerText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  secondaryButton: {
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#FAFBFF',
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '700', color: '#4338CA' },
  trustRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 10,
  },
  trustTag: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0',
  },
  trustTagText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  snackbar: { borderRadius: 12, backgroundColor: '#1E1B4B' },
});
