import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text, useTheme, ActivityIndicator, Title,
  TextInput, Button, Divider, Snackbar
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AdminStackParamList } from '../../navigation/types';
import {
  getAdminRequestById, updateAdminRequest, deleteAdminRequest,
  ServiceRequest, ServiceRequestStatus
} from '../../api/services';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'AdminRequestDetail'>;
type Route = RouteProp<AdminStackParamList, 'AdminRequestDetail'>;

const ALL_STATUSES: ServiceRequestStatus[] = [
  'NEW', 'UNDER_REVIEW', 'NEEDS_INFORMATION', 'QUOTATION_SENT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
];

const STATUS_COLORS: Record<ServiceRequestStatus, { color: string; bg: string }> = {
  NEW: { color: '#4338CA', bg: '#EEF2FF' },
  UNDER_REVIEW: { color: '#7C3AED', bg: '#F5F3FF' },
  NEEDS_INFORMATION: { color: '#D97706', bg: '#FFFBEB' },
  QUOTATION_SENT: { color: '#0891B2', bg: '#ECFEFF' },
  IN_PROGRESS: { color: '#2563EB', bg: '#EFF6FF' },
  COMPLETED: { color: '#059669', bg: '#ECFDF5' },
  CANCELLED: { color: '#DC2626', bg: '#FEF2F2' },
};

export const AdminRequestDetailScreen = ({ navigation, route }: { navigation: Nav; route: Route }) => {
  const { requestId } = route.params;
  const theme = useTheme();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ServiceRequestStatus>('NEW');
  const [adminNotes, setAdminNotes] = useState('');
  const [snackbar, setSnackbar] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const req = await getAdminRequestById(requestId);
        setRequest(req);
        if (req) {
          setSelectedStatus(req.status);
          setAdminNotes(req.adminNotes || '');
        }
      } catch (err: any) {
        setSnackbar(err.message || 'Failed to load request.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [requestId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateAdminRequest(requestId, {
        status: selectedStatus,
        adminNotes: adminNotes.trim() || undefined,
      });
      setRequest(updated);
      setSnackbar('Request updated successfully!');
    } catch (err: any) {
      setSnackbar(err.response?.data?.message || err.message || 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Request',
      `Are you sure you want to permanently delete ${request?.requestNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAdminRequest(requestId);
              navigation.goBack();
            } catch (err: any) {
              setSnackbar(err.message || 'Failed to delete.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

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
        <Text style={{ color: '#94A3B8', marginTop: 12 }}>Request not found.</Text>
      </View>
    );
  }

  const statusCfg = STATUS_COLORS[request.status];
  const reqKeys = Object.keys(request.requirements || {});

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: theme.colors.secondary }]}>
          <View style={styles.headerTop}>
            <Text style={styles.reqNumLabel}>Request</Text>
            <View style={[styles.currentStatus, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.currentStatusText, { color: statusCfg.color }]}>{request.status}</Text>
            </View>
          </View>
          <Title style={styles.reqNum}>{request.requestNumber}</Title>
          <Text style={styles.headerDate}>
            {new Date(request.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {/* Customer Details */}
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>Customer</Text>
          <Divider style={styles.divider} />
          <InfoRow label="Name" value={request.customer.name} />
          <InfoRow label="Email" value={request.customer.email} />
          {request.customer.whatsapp && <InfoRow label="WhatsApp" value={request.customer.whatsapp} />}
          {request.customer.phone && <InfoRow label="Phone" value={request.customer.phone} />}
          <InfoRow label="Contact via" value={request.preferredContactMethod} />
        </View>

        {/* Submitted Requirements */}
        {reqKeys.length > 0 && (
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>Requirements</Text>
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
        {request.additionalMessage && (
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>Customer Notes</Text>
            <Divider style={styles.divider} />
            <Text style={styles.messageText}>{request.additionalMessage}</Text>
          </View>
        )}

        {/* ── Admin Actions ──────────────────────────── */}
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>⚡ Admin Actions</Text>
          <Divider style={styles.divider} />

          {/* Status picker */}
          <Text style={styles.fieldLabel}>Update Status</Text>
          <View style={styles.statusGrid}>
            {ALL_STATUSES.map(status => {
              const cfg = STATUS_COLORS[status];
              const active = selectedStatus === status;
              return (
                <View
                  key={status}
                  style={[
                    styles.statusOption,
                    { borderColor: active ? cfg.color : '#E2E8F0', backgroundColor: active ? cfg.bg : '#F8FAFC' }
                  ]}
                >
                  <Text
                    style={[styles.statusOptionText, { color: active ? cfg.color : '#94A3B8' }]}
                    onPress={() => setSelectedStatus(status)}
                  >
                    {status.replace(/_/g, ' ')}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Admin Notes */}
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Admin Notes</Text>
          <TextInput
            value={adminNotes}
            onChangeText={setAdminNotes}
            mode="outlined"
            multiline
            numberOfLines={4}
            placeholder="Add internal notes, quotation details, or follow-up actions..."
            style={styles.notesInput}
            outlineStyle={{ borderRadius: 12, borderColor: '#E2E8F0' }}
          />

          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
            contentStyle={{ paddingVertical: 10 }}
            labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
            icon="content-save"
          >
            Save Changes
          </Button>

          <Button
            mode="outlined"
            onPress={handleDelete}
            loading={deleting}
            disabled={deleting}
            style={styles.deleteButton}
            labelStyle={{ fontWeight: 'bold', color: theme.colors.error }}
            textColor={theme.colors.error}
            icon="trash-can-outline"
          >
            Delete Request
          </Button>
        </View>

      </ScrollView>
      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={4000}>{snackbar}</Snackbar>
    </View>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 48 },
  headerCard: {
    borderRadius: 20, padding: 24, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 6,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  reqNumLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase' },
  currentStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  currentStatusText: { fontSize: 12, fontWeight: '800' },
  reqNum: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  headerDate: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 10,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  divider: { backgroundColor: '#F1F5F9', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  infoLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#1E1B4B', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 16 },
  reqRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  reqKey: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  reqValue: { fontSize: 14, color: '#334155', fontWeight: '500' },
  messageText: { fontSize: 15, color: '#475569', lineHeight: 24 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 10 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusOption: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5,
  },
  statusOptionText: { fontSize: 12, fontWeight: '700' },
  notesInput: { backgroundColor: '#F8FAFC', marginBottom: 20 },
  saveButton: { borderRadius: 12, marginBottom: 12 },
  deleteButton: {
    borderRadius: 12, borderWidth: 1.5,
    borderColor: '#EF4444',
  },
});
