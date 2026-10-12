import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RequestsStackParamList } from '../../navigation/types';
import { ServiceRequestStatus } from '../../api/services';

type Nav = NativeStackNavigationProp<RequestsStackParamList, 'MyRequests'>;

// ─── NOTE ──────────────────────────────────────────────────────────────────────
// The backend does NOT have GET /api/requests (list all user's requests).
// Only GET /api/requests/:id (single) and POST /api/requests.
// The admin endpoint GET /api/admin/requests requires ADMIN role.
// For customer users, we show a "Submit a Request" prompt.
// ──────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ServiceRequestStatus, { color: string; bg: string; icon: string; label: string }> = {
  NEW: { color: '#4338CA', bg: '#EEF2FF', icon: 'clock-outline', label: 'New' },
  UNDER_REVIEW: { color: '#7C3AED', bg: '#F5F3FF', icon: 'eye-outline', label: 'Under Review' },
  NEEDS_INFORMATION: { color: '#D97706', bg: '#FFFBEB', icon: 'information-outline', label: 'Needs Info' },
  QUOTATION_SENT: { color: '#0891B2', bg: '#ECFEFF', icon: 'file-document-outline', label: 'Quote Sent' },
  IN_PROGRESS: { color: '#2563EB', bg: '#EFF6FF', icon: 'progress-wrench', label: 'In Progress' },
  COMPLETED: { color: '#059669', bg: '#ECFDF5', icon: 'check-circle-outline', label: 'Completed' },
  CANCELLED: { color: '#DC2626', bg: '#FEF2F2', icon: 'close-circle-outline', label: 'Cancelled' },
};

const FEATURES = [
  { icon: 'magnify', color: '#4338CA', bg: '#EEF2FF', title: 'Browse Services', desc: 'Explore our full catalog of research services across multiple domains.' },
  { icon: 'file-document-edit-outline', color: '#7C3AED', bg: '#F5F3FF', title: 'Submit Requests', desc: 'Fill out a customized form for any service and submit your requirements.' },
  { icon: 'chat-processing-outline', color: '#0891B2', bg: '#ECFEFF', title: 'Quick Response', desc: 'Our team responds via your preferred channel — WhatsApp, Email, or Phone.' },
  { icon: 'shield-check-outline', color: '#059669', bg: '#ECFDF5', title: 'Secure & Confidential', desc: 'Your research data and requirements are treated with complete confidentiality.' },
];

export const MyRequestsScreen = ({ navigation }: { navigation: Nav }) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={FEATURES}
        keyExtractor={(item) => item.title}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.secondary }]}>
              <Icon name="clipboard-list-outline" size={40} color="rgba(255,255,255,0.9)" style={{ marginBottom: 12 }} />
              <Text style={styles.headerTitle}>My Requests</Text>
              <Text style={styles.headerSubtitle}>
                Submit a service request from the Explore tab and track its progress here.
              </Text>
            </View>

            {/* Status Key */}
            <View style={styles.sectionCard}>
              <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>Request Status Guide</Text>
              <View style={styles.statusGrid}>
                {(Object.entries(STATUS_CONFIG) as [ServiceRequestStatus, typeof STATUS_CONFIG[ServiceRequestStatus]][]).map(([key, cfg]) => (
                  <View key={key} style={[styles.statusItem, { backgroundColor: cfg.bg }]}>
                    <Icon name={cfg.icon} size={16} color={cfg.color} />
                    <Text style={[styles.statusItemLabel, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={[styles.featureHeading, { color: theme.colors.secondary }]}>How It Works</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: item.bg }]}>
              <Icon name={item.icon} size={26} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.featureTitle, { color: theme.colors.secondary }]}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.desc}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 32,
    paddingTop: 56,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  sectionCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12,
  },
  statusItemLabel: { fontSize: 12, fontWeight: '700' },
  featureHeading: {
    fontSize: 20,
    fontWeight: '800',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  featureCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  featureIcon: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  featureTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  featureDesc: { fontSize: 13, color: '#64748B', lineHeight: 20 },
  listContent: { paddingBottom: 40 },
});
