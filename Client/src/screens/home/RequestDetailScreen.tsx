import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import {
  Title, Text, useTheme, ActivityIndicator,
  Divider, Button, Snackbar
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { HomeStackParamList, RequestsStackParamList } from '../../navigation/types';
import { getRequestById, ServiceRequest, ServiceRequestStatus } from '../../api/services';

// Works for both HomeStack and RequestsStack
type Nav = NativeStackNavigationProp<HomeStackParamList & RequestsStackParamList, 'RequestDetail'>;
type Route = RouteProp<HomeStackParamList & RequestsStackParamList, 'RequestDetail'>;

const STATUS_CONFIG: Record<ServiceRequestStatus, { color: string; icon: string; label: string }> = {
  NEW: { color: '#4338CA', icon: 'clock-outline', label: 'New' },
  UNDER_REVIEW: { color: '#7C3AED', icon: 'eye-outline', label: 'Under Review' },
  NEEDS_INFORMATION: { color: '#D97706', icon: 'information-outline', label: 'Needs Info' },
  QUOTATION_SENT: { color: '#0891B2', icon: 'file-document-outline', label: 'Quote Sent' },
  IN_PROGRESS: { color: '#2563EB', icon: 'progress-wrench', label: 'In Progress' },
  COMPLETED: { color: '#059669', icon: 'check-circle-outline', label: 'Completed' },
  CANCELLED: { color: '#DC2626', icon: 'close-circle-outline', label: 'Cancelled' },
};

export const RequestDetailScreen = ({ navigation, route }: { navigation: Nav; route: Route }) => {
  const { requestId } = route.params;
  const theme = useTheme();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const fetch = async () => {
      try {
        const req = await getRequestById(requestId);
        setRequest(req);
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      } catch (err: any) {
        setError(err.message || 'Failed to load request.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [requestId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.center}>
        <Icon name="alert-circle-outline" size={48} color="#CBD5E1" />
        <Text style={styles.emptyText}>Request not found.</Text>
        {error ? <Text style={{ color: theme.colors.error, fontSize: 13, marginTop: 8 }}>{error}</Text> : null}
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.NEW;
  const reqKeys = Object.keys(request.requirements || {});

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.requestNumberLabel}>Request Number</Text>
                <Title style={[styles.requestNumber, { color: theme.colors.secondary }]}>{request.requestNumber}</Title>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '15' }]}>
                <Icon name={statusCfg.icon} size={14} color={statusCfg.color} />
                <Text style={[styles.statusLabel, { color: statusCfg.color }]}>{statusCfg.label}</Text>
              </View>
            </View>
            <Text style={styles.dateText}>
              Submitted {new Date(request.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </View>

          {/* Customer Info */}
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>Customer Details</Text>
            <Divider style={styles.divider} />
            <InfoRow icon="account-outline" label="Name" value={request.customer.name} />
            <InfoRow icon="email-outline" label="Email" value={request.customer.email} />
            {request.customer.whatsapp ? <InfoRow icon="whatsapp" label="WhatsApp" value={request.customer.whatsapp} /> : null}
            {request.customer.phone ? <InfoRow icon="phone-outline" label="Phone" value={request.customer.phone} /> : null}
            <InfoRow icon="message-outline" label="Contact via" value={request.preferredContactMethod} />
          </View>

          {/* Requirements */}
          {reqKeys.length > 0 && (
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>Submitted Requirements</Text>
              <Divider style={styles.divider} />
              {reqKeys.map(key => {
                const val = request.requirements[key];
                const displayVal = Array.isArray(val) ? (val as string[]).join(', ') : String(val ?? '—');
                return (
                  <View key={key} style={styles.reqRow}>
                    <Text style={styles.reqKey}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                    <Text style={styles.reqValue}>{displayVal || '—'}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Additional Message */}
          {request.additionalMessage ? (
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>Additional Notes</Text>
              <Divider style={styles.divider} />
              <Text style={styles.messageText}>{request.additionalMessage}</Text>
            </View>
          ) : null}

          {/* Admin Notes (if any) */}
          {request.adminNotes ? (
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: theme.colors.primary }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>📋 Admin Notes</Text>
              <Divider style={styles.divider} />
              <Text style={styles.messageText}>{request.adminNotes}</Text>
            </View>
          ) : null}

        </Animated.View>
      </ScrollView>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={4000}>{error}</Snackbar>
    </View>
  );
};

const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconBox}>
      <Icon name={icon} size={18} color="#64748B" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: '#94A3B8', fontSize: 16, marginTop: 12 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  requestNumberLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  requestNumber: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  statusLabel: { fontWeight: '700', fontSize: 13 },
  dateText: { fontSize: 13, color: '#94A3B8' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  divider: { backgroundColor: '#F1F5F9', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  infoIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  infoLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#1E1B4B', fontWeight: '600' },
  reqRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  reqKey: { fontSize: 12, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
  reqValue: { fontSize: 15, color: '#334155', fontWeight: '500' },
  messageText: { fontSize: 15, color: '#475569', lineHeight: 24 },
});
