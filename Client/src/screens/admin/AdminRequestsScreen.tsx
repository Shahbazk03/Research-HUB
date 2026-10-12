import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../navigation/types';
import { getAdminRequests, ServiceRequest, ServiceRequestStatus } from '../../api/services';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'AdminRequests'>;

const STATUS_CONFIG: Record<ServiceRequestStatus, { color: string; bg: string; icon: string; label: string }> = {
  NEW: { color: '#4338CA', bg: '#EEF2FF', icon: 'clock-outline', label: 'New' },
  UNDER_REVIEW: { color: '#7C3AED', bg: '#F5F3FF', icon: 'eye-outline', label: 'Under Review' },
  NEEDS_INFORMATION: { color: '#D97706', bg: '#FFFBEB', icon: 'information-outline', label: 'Needs Info' },
  QUOTATION_SENT: { color: '#0891B2', bg: '#ECFEFF', icon: 'file-document-outline', label: 'Quote Sent' },
  IN_PROGRESS: { color: '#2563EB', bg: '#EFF6FF', icon: 'progress-wrench', label: 'In Progress' },
  COMPLETED: { color: '#059669', bg: '#ECFDF5', icon: 'check-circle-outline', label: 'Completed' },
  CANCELLED: { color: '#DC2626', bg: '#FEF2F2', icon: 'close-circle-outline', label: 'Cancelled' },
};

const FILTERS: Array<ServiceRequestStatus | 'ALL'> = [
  'ALL', 'NEW', 'UNDER_REVIEW', 'NEEDS_INFORMATION', 'QUOTATION_SENT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
];

export const AdminRequestsScreen = ({ navigation }: { navigation: Nav }) => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ServiceRequestStatus | 'ALL'>('ALL');
  const [total, setTotal] = useState(0);
  const theme = useTheme();

  const fetchRequests = async () => {
    try {
      const data = await getAdminRequests({
        status: activeFilter !== 'ALL' ? activeFilter : undefined,
        limit: 100,
      });
      setRequests(data?.requests || []);
      setTotal(data?.total || 0);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load requests.');
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchRequests();
  }, [activeFilter]);

  const renderRequest = ({ item }: { item: ServiceRequest }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.NEW;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AdminRequestDetail', { requestId: item._id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
            <Icon name={cfg.icon} size={20} color={cfg.color} />
          </View>
          <View style={styles.cardMid}>
            <Text style={styles.requestNumber}>{item.requestNumber}</Text>
            <Text style={styles.customerName}>{item.customer.name} · {item.customer.email}</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#CBD5E1" />
        </View>
        <View style={styles.cardBottom}>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Admin Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.secondary }]}>
        <View style={styles.headerRow}>
          <Icon name="shield-crown-outline" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Admin Panel</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {total} total requests
        </Text>
      </View>

      {/* Filters */}
      <FlatList
        data={FILTERS}
        keyExtractor={(item) => item}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => {
          const active = item === activeFilter;
          const cfg = item !== 'ALL' ? STATUS_CONFIG[item as ServiceRequestStatus] : null;
          return (
            <TouchableOpacity
              style={[
                styles.filterChip,
                active && { backgroundColor: cfg?.color || theme.colors.secondary, borderColor: 'transparent' }
              ]}
              onPress={() => setActiveFilter(item as ServiceRequestStatus | 'ALL')}
            >
              {cfg && <Icon name={cfg.icon} size={12} color={active ? '#FFFFFF' : '#64748B'} style={{ marginRight: 4 }} />}
              <Text style={[styles.filterChipText, active && { color: '#FFFFFF' }]}>
                {item === 'ALL' ? 'All' : cfg?.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item._id}
          renderItem={renderRequest}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRequests(); }} tintColor={theme.colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="inbox-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>No requests found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  header: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginLeft: 34 },
  filterList: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  listContainer: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04, shadowRadius: 8,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardMid: { flex: 1 },
  requestNumber: { fontSize: 14, fontWeight: '800', color: '#1E1B4B', marginBottom: 2 },
  customerName: { fontSize: 12, color: '#64748B' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '700' },
  dateText: { fontSize: 12, color: '#94A3B8' },
  emptyContainer: { marginTop: 60, alignItems: 'center', padding: 24 },
  emptyText: { color: '#94A3B8', fontSize: 16, marginTop: 12 },
});
