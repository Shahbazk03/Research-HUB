import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Animated, TouchableOpacity, Dimensions
} from 'react-native';
import { Text, TextInput, Button, useTheme, Snackbar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../../navigation/types';
import { submitRequest } from '../../api/services';
import { AuthContext } from '../../context/AuthContext';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'RequestForm'>;
type Route = RouteProp<HomeStackParamList, 'RequestForm'>;
type ContactMethod = 'WHATSAPP' | 'EMAIL' | 'PHONE';

const { width } = Dimensions.get('window');

const CONTACT_OPTIONS: { method: ContactMethod; icon: string; label: string; color: string }[] = [
  { method: 'WHATSAPP', icon: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
  { method: 'EMAIL', icon: 'email-outline', label: 'Email', color: '#4338CA' },
  { method: 'PHONE', icon: 'phone-outline', label: 'Phone Call', color: '#0891B2' },
];

const BUDGET_OPTIONS = [
  { label: 'Under ₹2,000', value: 'under_2000' },
  { label: '₹2,000 – ₹5,000', value: '2000_5000' },
  { label: '₹5,000 – ₹10,000', value: '5000_10000' },
  { label: '₹10,000 – ₹20,000', value: '10000_20000' },
  { label: 'Above ₹20,000', value: 'above_20000' },
  { label: 'Let us quote', value: 'flexible' },
];

export const RequestFormScreen = ({ navigation, route }: { navigation: Nav; route: Route }) => {
  const { serviceId, serviceName } = route.params;
  const { user } = useContext(AuthContext);
  const theme = useTheme();

  // ── Step state
  const [step, setStep] = useState(1);
  const stepAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Step 1: Requirements
  const [university, setUniversity] = useState('');
  const [topic, setTopic] = useState('');
  const [requirements, setRequirements] = useState('');
  const [deadline, setDeadline] = useState('');
  const [budget, setBudget] = useState('');

  // ── Step 2: Contact
  const [name, setName] = useState(user ? `${user.firstName} ${user.lastName || ''}`.trim() : '');
  const [email, setEmail] = useState(user?.email || '');
  const [whatsapp, setWhatsapp] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('WHATSAPP');

  // ── State
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestNumber, setRequestNumber] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const goToStep2 = () => {
    if (!requirements.trim() || requirements.trim().length < 20) {
      setError('Please describe your requirements in at least 20 characters.');
      return;
    }
    setError('');
    Animated.sequence([
      Animated.timing(stepAnim, { toValue: -width, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setStep(2);
      stepAnim.setValue(width);
      Animated.spring(stepAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    });
  };

  const goBack = () => {
    Animated.sequence([
      Animated.timing(stepAnim, { toValue: width, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setStep(1);
      stepAnim.setValue(-width);
      Animated.spring(stepAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Full name is required'); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('A valid email is required'); return; }
    if (contactMethod === 'WHATSAPP' && !whatsapp.trim()) { setError('WhatsApp number is required'); return; }
    if (contactMethod === 'PHONE' && !phone.trim()) { setError('Phone number is required'); return; }

    setSubmitting(true); setError('');
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        serviceId,
        requirements: {
          university: university.trim() || undefined,
          topic: topic.trim() || undefined,
          description: requirements.trim(),
          deadline: deadline.trim() || undefined,
          budget: budget || undefined,
        },
        additionalMessage: requirements.trim(),
        preferredContactMethod: contactMethod,
      };
      const res = await submitRequest(payload);
      if (res.success) {
        setRequestNumber(res.data?.requestNumber || 'RH-XXXX');
        setSubmitted(true);
      } else {
        setError(res.message || 'Submission failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Cannot connect. Is the server running?');
    } finally { setSubmitting(false); }
  };

  // ── Success Screen
  if (submitted) {
    return (
      <View style={[styles.successContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.successOrb1} />
        <View style={styles.successOrb2} />
        <View style={styles.successCard}>
          <View style={styles.successCheck}>
            <Icon name="check-bold" size={36} color="#059669" />
          </View>
          <Text style={styles.successTitle}>Request Submitted!</Text>
          <Text style={styles.successReqNum}>{requestNumber}</Text>
          <Text style={styles.successMsg}>
            Our team will review your requirements and contact you via{' '}
            <Text style={{ fontWeight: '800', color: theme.colors.primary }}>
              {contactMethod === 'WHATSAPP' ? 'WhatsApp' : contactMethod === 'EMAIL' ? 'Email' : 'Phone'}
            </Text>
            {' '}within 24 hours with pricing and next steps.
          </Text>
          <View style={styles.successInfoRow}>
            <Icon name="clock-outline" size={16} color="#64748B" />
            <Text style={styles.successInfoText}>Response within 24 hours</Text>
          </View>
          <View style={styles.successInfoRow}>
            <Icon name="shield-check-outline" size={16} color="#64748B" />
            <Text style={styles.successInfoText}>100% confidential & plagiarism-free</Text>
          </View>
        </View>
        <Button
          mode="contained"
          style={[styles.successBtn, { backgroundColor: theme.colors.primary }]}
          contentStyle={{ paddingVertical: 12 }}
          labelStyle={{ fontWeight: '800', fontSize: 16 }}
          onPress={() => navigation.navigate('Home')}
        >
          Back to Home
        </Button>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.successSecondary}>
          <Text style={{ color: '#64748B', fontWeight: '600' }}>Submit another request</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress Header */}
      <View style={[styles.progressHeader, { backgroundColor: theme.colors.secondary }]}>
        <View style={styles.progressHeaderOrb} />
        <TouchableOpacity
          onPress={step === 1 ? () => navigation.goBack() : goBack}
          style={styles.progressBackBtn}
        >
          <Icon name="arrow-left" size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <Text style={styles.progressServiceName} numberOfLines={1}>{serviceName}</Text>
        <View style={styles.stepIndicatorRow}>
          {[1, 2].map(s => (
            <View key={s} style={[styles.stepDot, s === step && styles.stepDotActive, s < step && styles.stepDotDone]}>
              {s < step
                ? <Icon name="check" size={11} color="#FFFFFF" />
                : <Text style={[styles.stepDotText, s === step && { color: '#FFFFFF' }]}>{s}</Text>
              }
            </View>
          ))}
          <View style={[styles.stepLine, step >= 2 && { backgroundColor: '#FFFFFF' }]} />
        </View>
        <Text style={styles.progressStepLabel}>
          {step === 1 ? 'Step 1 of 2 — Your Requirements' : 'Step 2 of 2 — Contact Information'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ transform: [{ translateX: stepAnim }], opacity: fadeAnim }}>

          {/* ── STEP 1: Requirements ──────────────────────────── */}
          {step === 1 && (
            <View>
              <View style={styles.stepHeader}>
                <Text style={styles.stepHeaderEmoji}>📋</Text>
                <View>
                  <Text style={[styles.stepTitle, { color: theme.colors.secondary }]}>Tell Us What You Need</Text>
                  <Text style={styles.stepSubtitle}>Be as detailed as possible — our experts need the full picture</Text>
                </View>
              </View>

              <View style={styles.formCard}>
                <Text style={styles.fieldLabel}>University / Institution</Text>
                <TextInput
                  value={university}
                  onChangeText={setUniversity}
                  mode="outlined"
                  placeholder="e.g., Delhi University, IIT Bombay, Amity…"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  left={<TextInput.Icon icon="school-outline" />}
                />

                <Text style={styles.fieldLabel}>Research Topic / Project Title</Text>
                <TextInput
                  value={topic}
                  onChangeText={setTopic}
                  mode="outlined"
                  placeholder="e.g., Sentiment Analysis using BERT for Twitter Data"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  left={<TextInput.Icon icon="text-short" />}
                />

                <View style={styles.requiredRow}>
                  <Text style={styles.fieldLabel}>Describe Your Requirements *</Text>
                  <View style={styles.requiredBadge}><Text style={styles.requiredBadgeText}>Required</Text></View>
                </View>
                <TextInput
                  value={requirements}
                  onChangeText={setRequirements}
                  mode="outlined"
                  placeholder={
                    `Describe everything in detail:\n\n• What type of project/paper do you need?\n• Number of pages / word count\n• Programming language (if applicable)\n• Specific algorithms or methods\n• Any existing work done\n• Special instructions…`
                  }
                  multiline
                  numberOfLines={10}
                  style={[styles.input, styles.textArea]}
                  outlineStyle={styles.inputOutline}
                />
                <Text style={styles.charHint}>{requirements.length} characters {requirements.length < 20 ? '— minimum 20 required' : '✓'}</Text>

                <Text style={styles.fieldLabel}>Deadline</Text>
                <TextInput
                  value={deadline}
                  onChangeText={setDeadline}
                  mode="outlined"
                  placeholder="e.g., 15 Oct 2024, or 'Urgent — 3 days'"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  left={<TextInput.Icon icon="calendar-outline" />}
                />

                <Text style={styles.fieldLabel}>Budget Range (Optional)</Text>
                <View style={styles.budgetGrid}>
                  {BUDGET_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.budgetChip,
                        budget === opt.value && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                      ]}
                      onPress={() => setBudget(budget === opt.value ? '' : opt.value)}
                    >
                      <Text style={[styles.budgetChipText, budget === opt.value && { color: '#FFFFFF' }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Button
                mode="contained"
                onPress={goToStep2}
                style={[styles.nextBtn, { backgroundColor: theme.colors.primary }]}
                contentStyle={styles.nextBtnContent}
                labelStyle={styles.nextBtnLabel}
                icon="arrow-right"
              >
                Next: Contact Info
              </Button>
            </View>
          )}

          {/* ── STEP 2: Contact Info ──────────────────────────── */}
          {step === 2 && (
            <View>
              <View style={styles.stepHeader}>
                <Text style={styles.stepHeaderEmoji}>📞</Text>
                <View>
                  <Text style={[styles.stepTitle, { color: theme.colors.secondary }]}>How Should We Contact You?</Text>
                  <Text style={styles.stepSubtitle}>Our expert will reach out to discuss pricing & next steps</Text>
                </View>
              </View>

              <View style={styles.formCard}>
                <Text style={styles.fieldLabel}>Full Name *</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  mode="outlined"
                  placeholder="Your full name"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  left={<TextInput.Icon icon="account-outline" />}
                />

                <Text style={styles.fieldLabel}>Email Address *</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  left={<TextInput.Icon icon="email-outline" />}
                />

                <Text style={styles.fieldLabel}>WhatsApp Number</Text>
                <TextInput
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                  mode="outlined"
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  left={<TextInput.Icon icon="whatsapp" />}
                />

                <Text style={styles.fieldLabel}>Phone Number</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  mode="outlined"
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  left={<TextInput.Icon icon="phone-outline" />}
                />
              </View>

              {/* Preferred contact method */}
              <View style={styles.contactCard}>
                <Text style={[styles.contactCardTitle, { color: theme.colors.secondary }]}>Preferred Contact Method *</Text>
                <Text style={styles.contactCardSub}>How would you like our expert to reach you first?</Text>
                <View style={styles.contactOptions}>
                  {CONTACT_OPTIONS.map(opt => {
                    const active = contactMethod === opt.method;
                    return (
                      <TouchableOpacity
                        key={opt.method}
                        style={[
                          styles.contactOption,
                          active && { borderColor: opt.color, backgroundColor: opt.color + '10' }
                        ]}
                        onPress={() => setContactMethod(opt.method)}
                      >
                        <View style={[styles.contactOptionIcon, { backgroundColor: opt.color + (active ? '20' : '12') }]}>
                          <Icon name={opt.icon} size={22} color={opt.color} />
                        </View>
                        <Text style={[styles.contactOptionLabel, active && { color: opt.color, fontWeight: '800' }]}>
                          {opt.label}
                        </Text>
                        {active && (
                          <View style={[styles.contactCheckmark, { backgroundColor: opt.color }]}>
                            <Icon name="check" size={10} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Summary card */}
              <View style={[styles.summaryCard, { backgroundColor: theme.colors.secondary + '08', borderColor: theme.colors.secondary + '20' }]}>
                <Text style={[styles.summaryTitle, { color: theme.colors.secondary }]}>📋 Request Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Service</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>{serviceName}</Text>
                </View>
                {topic ? <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Topic</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>{topic}</Text>
                </View> : null}
                {deadline ? <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Deadline</Text>
                  <Text style={styles.summaryValue}>{deadline}</Text>
                </View> : null}
                {budget ? <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Budget</Text>
                  <Text style={styles.summaryValue}>{BUDGET_OPTIONS.find(b => b.value === budget)?.label}</Text>
                </View> : null}
              </View>

              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting}
                style={[styles.submitBtn, { backgroundColor: theme.colors.primary }]}
                contentStyle={styles.nextBtnContent}
                labelStyle={styles.nextBtnLabel}
                icon="send"
              >
                Submit Request
              </Button>

              <Text style={styles.disclaimer}>
                🔒 Your information is confidential. Our team will contact you within 24 hours.
              </Text>
            </View>
          )}

        </Animated.View>
      </ScrollView>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={5000}
        style={{ borderRadius: 12, backgroundColor: '#1E1B4B' }}
        action={{ label: '✕', onPress: () => setError('') }}>
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Progress header
  progressHeader: {
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 20,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    overflow: 'hidden', position: 'relative',
  },
  progressHeaderOrb: { position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.06)' },
  progressBackBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  progressServiceName: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginBottom: 14 },
  stepIndicatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', marginRight: 4 },
  stepDotActive: { backgroundColor: '#4338CA', borderColor: '#FFFFFF' },
  stepDotDone: { backgroundColor: '#059669', borderColor: '#FFFFFF' },
  stepDotText: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8, borderRadius: 1 },
  progressStepLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  // Scroll
  scrollContent: { padding: 16, paddingBottom: 48 },
  // Step header
  stepHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginVertical: 20 },
  stepHeaderEmoji: { fontSize: 32 },
  stepTitle: { fontSize: 20, fontWeight: '900', lineHeight: 26, marginBottom: 4 },
  stepSubtitle: { fontSize: 13, color: '#64748B', lineHeight: 19 },
  // Form
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#1E1B4B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  requiredRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  requiredBadge: { backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  requiredBadgeText: { fontSize: 10, color: '#DC2626', fontWeight: '700' },
  input: { marginBottom: 16, backgroundColor: '#F8FAFC' },
  inputOutline: { borderRadius: 12, borderColor: '#E2E8F0' },
  textArea: { minHeight: 180 },
  charHint: { fontSize: 12, color: '#94A3B8', marginTop: -10, marginBottom: 16, textAlign: 'right' },
  budgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  budgetChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  budgetChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  // Contact method
  contactCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#1E1B4B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  contactCardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  contactCardSub: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  contactOptions: { flexDirection: 'row', gap: 10 },
  contactOption: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 2, borderColor: '#E2E8F0', backgroundColor: '#FAFAFA', position: 'relative' },
  contactOptionIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  contactOptionLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', textAlign: 'center' },
  contactCheckmark: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  // Summary
  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  summaryTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  summaryLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  summaryValue: { fontSize: 13, color: '#1E1B4B', fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
  // Buttons
  nextBtn: { borderRadius: 16, marginBottom: 8, shadowColor: '#4338CA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5 },
  nextBtnContent: { paddingVertical: 14 },
  nextBtnLabel: { fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },
  submitBtn: { borderRadius: 16, marginBottom: 14, shadowColor: '#4338CA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5 },
  disclaimer: { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },
  // Success
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  successOrb1: { position: 'absolute', top: -60, right: -60, width: 250, height: 250, borderRadius: 125, backgroundColor: '#4338CA', opacity: 0.05 },
  successOrb2: { position: 'absolute', bottom: 60, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: '#059669', opacity: 0.05 },
  successCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 28, alignItems: 'center', width: '100%', shadowColor: '#1E1B4B', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 6, marginBottom: 24 },
  successCheck: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 3, borderColor: '#D1FAE5' },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#1E1B4B', marginBottom: 8 },
  successReqNum: { fontSize: 14, color: '#94A3B8', fontWeight: '700', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 16, letterSpacing: 0.5 },
  successMsg: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  successInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  successInfoText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  successBtn: { borderRadius: 16, width: '100%', marginBottom: 14, shadowColor: '#4338CA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  successSecondary: { padding: 12 },
});
