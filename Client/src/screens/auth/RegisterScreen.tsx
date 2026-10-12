import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Animated, TouchableOpacity
} from 'react-native';
import { TextInput, Button, Text, useTheme, Snackbar } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import apiClient from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export const RegisterScreen = ({ navigation }: { navigation: Nav }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const theme = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 8 }),
    ]).start();
  }, []);

  const handleRegister = async () => {
    if (!email || !password || !firstName) { setError('Name, email, and password are required'); return; }
    setLoading(true); setError('');
    try {
      const res = await apiClient.post('/auth/register', {
        firstName, lastName: lastName || undefined,
        email: email.toLowerCase(), password,
        phone: phone || undefined,
      });
      if (res.data.success) {
        await login(res.data.data.token, res.data.data.user);
      } else {
        setError(res.data.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Cannot connect to server. Is it running?');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.bgDecoration1} />
      <View style={styles.bgDecoration2} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.backButton}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.backText}>← Back to Login</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join thousands of researchers worldwide</Text>
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.nameRow}>
            <TextInput
              label="First Name *"
              value={firstName}
              onChangeText={setFirstName}
              mode="outlined"
              style={[styles.input, { flex: 1 }]}
              outlineStyle={styles.inputOutline}
            />
            <TextInput
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              mode="outlined"
              style={[styles.input, { flex: 1 }]}
              outlineStyle={styles.inputOutline}
            />
          </View>
          <TextInput
            label="Email Address *"
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
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="phone-outline" />}
          />
          <TextInput
            label="Password *"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPass}
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="lock-outline" />}
            right={<TextInput.Icon icon={showPass ? 'eye-off' : 'eye'} onPress={() => setShowPass(!showPass)} />}
          />

          <View style={styles.policyBox}>
            <Text style={styles.policyText}>
              By registering, you agree that your information will be used to process your service requests securely.
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Create Account
          </Button>
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
    position: 'absolute', top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: '#4338CA', opacity: 0.07,
  },
  bgDecoration2: {
    position: 'absolute', bottom: 100, left: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#10B981', opacity: 0.06,
  },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 56, paddingBottom: 40 },
  header: { marginBottom: 32 },
  backButton: { marginBottom: 20 },
  backText: { fontSize: 14, color: '#4338CA', fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '900', color: '#1E1B4B', letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#64748B' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 28, padding: 24,
    shadowColor: '#1E1B4B', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08, shadowRadius: 28, elevation: 6,
  },
  nameRow: { flexDirection: 'row', gap: 12 },
  input: { marginBottom: 14, backgroundColor: '#F8FAFC' },
  inputOutline: { borderRadius: 14, borderColor: '#E2E8F0' },
  policyBox: {
    backgroundColor: '#F8FAFC', borderRadius: 12,
    padding: 12, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0',
  },
  policyText: { fontSize: 12, color: '#94A3B8', lineHeight: 18 },
  button: {
    borderRadius: 14, backgroundColor: '#4338CA',
    shadowColor: '#4338CA', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  buttonContent: { paddingVertical: 12 },
  buttonLabel: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  snackbar: { borderRadius: 12, backgroundColor: '#1E1B4B' },
});
