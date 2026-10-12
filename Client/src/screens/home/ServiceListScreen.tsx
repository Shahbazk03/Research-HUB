import React, { useEffect, useState, useRef } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl,
  Pressable, Animated, TouchableOpacity
} from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../../navigation/types';
import { getServices, Service } from '../../api/services';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'ServiceList'>;
type Route = RouteProp<HomeStackParamList, 'ServiceList'>;

const ServiceCard = ({ item, onPress }: { item: Service; onPress: () => void }) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      onPress={onPress}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        {item.isFeatured && (
          <View style={styles.popularBadge}>
            <Icon name="star" size={10} color="#D97706" />
            <Text style={styles.popularText}>Popular</Text>
          </View>
        )}
        <Text style={styles.cardTitle}>{item.name}</Text>
        {item.shortDescription ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.shortDescription}</Text>
        ) : null}
        <View style={styles.cardMeta}>
          {item.turnaround ? (
            <View style={styles.metaChip}>
              <Icon name="clock-outline" size={12} color="#64748B" />
              <Text style={styles.metaText}>{item.turnaround}</Text>
            </View>
          ) : null}
          {item.idealFor ? (
            <View style={styles.metaChip}>
              <Icon name="school-outline" size={12} color="#64748B" />
              <Text style={styles.metaText} numberOfLines={1}>{item.idealFor}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.getStarted}>Get Started</Text>
          <Icon name="arrow-right" size={16} color="#4338CA" />
        </View>
      </Animated.View>
    </Pressable>
  );
};

export const ServiceListScreen = ({ navigation, route }: { navigation: Nav; route: Route }) => {
  const { categoryId, categoryName } = route.params;
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  const load = async () => {
    try { const d = await getServices(categoryId); setServices(d); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, [categoryId]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={services}
        keyExtractor={item => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.primary} />}
        renderItem={({ item }) => (
          <ServiceCard
            item={item}
            onPress={() => navigation.navigate('ServiceDetail', { serviceId: item._id, serviceTitle: item.name })}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Icon name="arrow-left" size={20} color="#64748B" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.secondary }]}>{categoryName}</Text>
            <Text style={styles.headerSub}>Select a service to request</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Icon name="briefcase-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyText}>No services available.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 32, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '900', marginBottom: 4, letterSpacing: -0.3 },
  headerSub: { fontSize: 14, color: '#64748B' },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 14,
    shadowColor: '#1E1B4B', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.07, shadowRadius: 14,
    elevation: 3, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
  },
  popularBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  popularText: { fontSize: 11, color: '#D97706', fontWeight: '700' },
  cardTitle: { fontSize: 17, fontWeight: '900', color: '#1E1B4B', marginBottom: 6, lineHeight: 24 },
  cardDesc: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 14 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: '#E2E8F0' },
  metaText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 12 },
  getStarted: { fontSize: 14, fontWeight: '700', color: '#4338CA' },
  emptyWrap: { marginTop: 60, alignItems: 'center', padding: 24 },
  emptyText: { color: '#94A3B8', fontSize: 16, marginTop: 12 },
});
