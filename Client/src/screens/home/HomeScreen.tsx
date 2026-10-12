import React, { useEffect, useState, useRef } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl,
  Pressable, Animated, Dimensions, ScrollView, TouchableOpacity
} from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/types';
import { getDomains, getFeaturedServices, Domain, Service } from '../../api/services';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;
const { width } = Dimensions.get('window');

const DEPT_ICONS: Record<string, string> = {
  'd1': '💻', 'd2': '🏥', 'd3': '📊', 'd4': '⚙️',
  'd5': '🌍', 'd6': '💰', 'd7': '⚖️', 'd8': '📚',
};
const DEPT_COLORS: Record<string, [string, string]> = {
  'd1': ['#4338CA', '#7C3AED'],
  'd2': ['#DC2626', '#F87171'],
  'd3': ['#0891B2', '#22D3EE'],
  'd4': ['#D97706', '#F59E0B'],
  'd5': ['#059669', '#34D399'],
  'd6': ['#7C3AED', '#A78BFA'],
  'd7': ['#1E1B4B', '#4338CA'],
  'd8': ['#B45309', '#D97706'],
};

const DeptCard = ({ item, index, onPress }: { item: Domain; index: number; onPress: () => void }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const colors = DEPT_COLORS[item._id] || ['#4338CA', '#7C3AED'];
  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200 }).start()}
      onPress={onPress}
    >
      <Animated.View style={[styles.deptCard, { backgroundColor: colors[0], transform: [{ scale }] }]}>
        <View style={[styles.deptCardAccent, { backgroundColor: colors[1] + '60' }]} />
        <Text style={styles.deptEmoji}>{DEPT_ICONS[item._id] || '📖'}</Text>
        <Text style={styles.deptName}>{item.name}</Text>
        <View style={styles.deptArrow}>
          <Icon name="arrow-right" size={14} color="rgba(255,255,255,0.85)" />
        </View>
      </Animated.View>
    </Pressable>
  );
};

const FeaturedCard = ({ item, onPress }: { item: Service; onPress: () => void }) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      onPress={onPress}
    >
      <Animated.View style={[styles.featuredCard, { transform: [{ scale }] }]}>
        <View style={styles.featuredBadge}>
          <Icon name="star" size={10} color="#F59E0B" />
          <Text style={styles.featuredBadgeText}>Popular</Text>
        </View>
        <Text style={styles.featuredName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.featuredDesc} numberOfLines={2}>{item.shortDescription}</Text>
        {item.turnaround ? (
          <View style={styles.turnaroundRow}>
            <Icon name="clock-fast" size={12} color="#64748B" />
            <Text style={styles.turnaroundText}>{item.turnaround}</Text>
          </View>
        ) : null}
        <View style={styles.featuredCTA}>
          <Text style={styles.featuredCTAText}>View Details</Text>
          <Icon name="chevron-right" size={14} color="#4338CA" />
        </View>
      </Animated.View>
    </Pressable>
  );
};

export const HomeScreen = ({ navigation }: { navigation: Nav }) => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [featured, setFeatured] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = async () => {
    try {
      const [d, f] = await Promise.all([getDomains(), getFeaturedServices()]);
      setDomains(d); setFeatured(f);
    } catch (e) { console.error(e); }
    finally {
      setLoading(false); setRefreshing(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: '#94A3B8', marginTop: 12, fontSize: 14 }}>Loading services…</Text>
      </View>
    );
  }

  const numCols = 2;
  const pairs: Domain[][] = [];
  for (let i = 0; i < domains.length; i += numCols) {
    pairs.push(domains.slice(i, i + numCols));
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.primary} />}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* ── Hero ─────────────────────────────────────────────── */}
          <View style={styles.hero}>
            <View style={styles.heroOrb1} />
            <View style={styles.heroOrb2} />
            <View style={styles.heroOrb3} />
            <View style={styles.heroBadge}>
              <Icon name="school-outline" size={14} color="#A78BFA" />
              <Text style={styles.heroBadgeText}>Academic Excellence Since 2020</Text>
            </View>
            <Text style={styles.heroTitle}>Research &{'\n'}Academic Services</Text>
            <Text style={styles.heroSubtitle}>
              Professional project writing, research papers, thesis and more — for universities across India & beyond.
            </Text>
            <View style={styles.statsRow}>
              {[['10K+', 'Projects Done'], ['500+', 'Researchers'], ['98%', 'Success Rate'], ['24h', 'Support']].map(([val, lbl]) => (
                <View key={lbl} style={styles.statItem}>
                  <Text style={styles.statVal}>{val}</Text>
                  <Text style={styles.statLbl}>{lbl}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── How It Works ─────────────────────────────────────── */}
          <View style={styles.howSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>How It Works</Text>
            <View style={styles.stepsRow}>
              {[
                { icon: 'magnify', label: 'Choose Service', color: '#4338CA' },
                { icon: 'file-edit-outline', label: 'Describe Need', color: '#7C3AED' },
                { icon: 'chat-outline', label: 'We Contact You', color: '#0891B2' },
                { icon: 'check-circle-outline', label: 'Get Delivered', color: '#059669' },
              ].map((step, i) => (
                <View key={step.label} style={styles.step}>
                  <View style={[styles.stepIcon, { backgroundColor: step.color + '15' }]}>
                    <Icon name={step.icon} size={20} color={step.color} />
                  </View>
                  <Text style={styles.stepLabel}>{step.label}</Text>
                  {i < 3 && <View style={styles.stepConnector} />}
                </View>
              ))}
            </View>
          </View>

          {/* ── Popular Services ──────────────────────────────────── */}
          {featured.length > 0 && (
            <View style={styles.featuredSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>Popular Services</Text>
              <FlatList
                data={featured}
                keyExtractor={item => item._id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredList}
                renderItem={({ item }) => (
                  <FeaturedCard
                    item={item}
                    onPress={() => navigation.navigate('ServiceDetail', { serviceId: item._id, serviceTitle: item.name })}
                  />
                )}
              />
            </View>
          )}

          {/* ── Departments ───────────────────────────────────────── */}
          <View style={styles.deptsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>Browse by Department</Text>
            {pairs.map((pair, rowIdx) => (
              <View key={rowIdx} style={styles.deptRow}>
                {pair.map((domain, colIdx) => (
                  <DeptCard
                    key={domain._id}
                    item={domain}
                    index={rowIdx * 2 + colIdx}
                    onPress={() => navigation.navigate('CategoryList', { domainId: domain._id, domainName: domain.name })}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* ── Trust Banner ──────────────────────────────────────── */}
          <View style={[styles.trustBanner, { backgroundColor: theme.colors.secondary }]}>
            <View style={styles.trustBannerOrb} />
            <Icon name="shield-check-outline" size={28} color="rgba(255,255,255,0.9)" style={{ marginBottom: 10 }} />
            <Text style={styles.trustTitle}>100% Plagiarism-Free Guarantee</Text>
            <Text style={styles.trustSubtitle}>Every project is original, custom-written and delivered with a plagiarism report.</Text>
          </View>

          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const CARD_W = (width - 48) / 2;
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Hero
  hero: {
    backgroundColor: '#1E1B4B', paddingHorizontal: 24,
    paddingTop: 56, paddingBottom: 40,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    marginBottom: 28, overflow: 'hidden', position: 'relative',
  },
  heroOrb1: { position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: '#4338CA', opacity: 0.35 },
  heroOrb2: { position: 'absolute', bottom: -40, left: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: '#7C3AED', opacity: 0.25 },
  heroOrb3: { position: 'absolute', top: 40, left: width * 0.5, width: 100, height: 100, borderRadius: 50, backgroundColor: '#10B981', opacity: 0.12 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(167,139,250,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' },
  heroBadgeText: { fontSize: 12, color: '#A78BFA', fontWeight: '700' },
  heroTitle: { fontSize: 34, fontWeight: '900', color: '#FFFFFF', lineHeight: 42, marginBottom: 12, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 23, marginBottom: 28 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 16, justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statItem: { alignItems: 'center', flex: 1 },
  statVal: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 2, textAlign: 'center' },
  // How it works
  howSection: { paddingHorizontal: 20, marginBottom: 28 },
  sectionTitle: { fontSize: 20, fontWeight: '900', marginBottom: 16, letterSpacing: -0.2 },
  stepsRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' },
  step: { flex: 1, alignItems: 'center', position: 'relative' },
  stepIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  stepLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', textAlign: 'center' },
  stepConnector: { position: 'absolute', top: 24, left: '60%', right: '-40%', height: 2, backgroundColor: '#E2E8F0' },
  // Featured
  featuredSection: { marginBottom: 28 },
  featuredList: { paddingHorizontal: 20, gap: 14 },
  featuredCard: { width: 220, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, shadowColor: '#1E1B4B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  featuredBadgeText: { fontSize: 11, color: '#D97706', fontWeight: '700' },
  featuredName: { fontSize: 15, fontWeight: '800', color: '#1E1B4B', lineHeight: 21, marginBottom: 6 },
  featuredDesc: { fontSize: 12, color: '#64748B', lineHeight: 18, marginBottom: 10 },
  turnaroundRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  turnaroundText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  featuredCTA: { flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  featuredCTAText: { fontSize: 13, color: '#4338CA', fontWeight: '700' },
  // Departments
  deptsSection: { paddingHorizontal: 16, marginBottom: 28 },
  deptRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  deptCard: { width: CARD_W, minHeight: 140, borderRadius: 22, padding: 16, overflow: 'hidden', position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 6 },
  deptCardAccent: { position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: 45 },
  deptEmoji: { fontSize: 30, marginBottom: 10 },
  deptName: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', lineHeight: 19 },
  deptArrow: { position: 'absolute', bottom: 12, right: 12, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  // Trust
  trustBanner: { marginHorizontal: 20, borderRadius: 24, padding: 28, alignItems: 'center', overflow: 'hidden', position: 'relative' },
  trustBannerOrb: { position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.07)' },
  trustTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  trustSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20, maxWidth: 280 },
});
