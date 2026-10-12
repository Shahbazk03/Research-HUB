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
import { getCategories, Category } from '../../api/services';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'CategoryList'>;
type Route = RouteProp<HomeStackParamList, 'CategoryList'>;

const ICONS = ['📝', '🔬', '📖', '✏️', '📊', '🎓', '📋', '🖥️', '🏗️', '⚕️'];
const COLORS = ['#4338CA', '#0891B2', '#059669', '#D97706', '#7C3AED', '#DC2626'];

const CategoryCard = ({ item, index, onPress }: { item: Category; index: number; onPress: () => void }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const color = COLORS[index % COLORS.length];
  const icon = ICONS[index % ICONS.length];
  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      onPress={onPress}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <View style={[styles.cardIconWrap, { backgroundColor: color + '12' }]}>
          <Text style={styles.cardEmoji}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
        </View>
        <View style={[styles.arrowBtn, { backgroundColor: color + '12' }]}>
          <Icon name="chevron-right" size={20} color={color} />
        </View>
      </Animated.View>
    </Pressable>
  );
};

export const CategoryListScreen = ({ navigation, route }: { navigation: Nav; route: Route }) => {
  const { domainId, domainName } = route.params;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  const load = async () => {
    try { const d = await getCategories(domainId); setCategories(d); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, [domainId]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={categories}
        keyExtractor={item => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.primary} />}
        renderItem={({ item, index }) => (
          <CategoryCard
            item={item} index={index}
            onPress={() => navigation.navigate('ServiceList', { categoryId: item._id, categoryName: item.name })}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={[styles.header, { backgroundColor: theme.colors.secondary }]}>
            <View style={styles.headerOrb} />
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Icon name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <Text style={styles.headerLabel}>Department</Text>
            <Text style={styles.headerTitle}>{domainName}</Text>
            <Text style={styles.headerSub}>Choose a service type</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Icon name="folder-open-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyText}>No service types found.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 24, paddingTop: 56, paddingBottom: 36,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    marginBottom: 20, overflow: 'hidden', position: 'relative',
  },
  headerOrb: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  headerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginBottom: 6, letterSpacing: -0.3 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: '#1E1B4B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12,
    elevation: 3, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
  },
  cardIconWrap: { width: 54, height: 54, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  cardEmoji: { fontSize: 26 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1E1B4B', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  arrowBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { marginTop: 60, alignItems: 'center', padding: 24 },
  emptyText: { color: '#94A3B8', fontSize: 16, marginTop: 12 },
});
