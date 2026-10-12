import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../../navigation/types';
import { getServiceById, Service } from '../../api/services';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'ServiceDetail'>;
type Route = RouteProp<HomeStackParamList, 'ServiceDetail'>;

export const ServiceDetailScreen = ({ navigation, route }: { navigation: Nav; route: Route }) => {
  const { serviceId } = route.params;
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    getServiceById(serviceId).then(s => {
      setService(s); setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80 }),
      ]).start();
    });
  }, [serviceId]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }
  if (!service) {
    return <View style={styles.center}><Icon name="alert-circle-outline" size={48} color="#CBD5E1" /><Text style={styles.errorText}>Service not found</Text></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Back button */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-left" size={20} color="#64748B" />
          </TouchableOpacity>

          {/* Service header */}
          <View style={[styles.heroCard, { backgroundColor: theme.colors.secondary }]}>
            <View style={styles.heroOrb} />
            {service.isFeatured && (
              <View style={styles.heroBadge}>
                <Icon name="star" size={12} color="#F59E0B" />
                <Text style={styles.heroBadgeText}>Most Popular</Text>
              </View>
            )}
            <Text style={styles.heroTitle}>{service.name}</Text>
            {service.shortDescription ? <Text style={styles.heroDesc}>{service.shortDescription}</Text> : null}
            <View style={styles.heroMeta}>
              {service.turnaround && (
                <View style={styles.metaPill}>
                  <Icon name="clock-fast" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.metaPillText}>{service.turnaround}</Text>
                </View>
              )}
              {service.idealFor && (
                <View style={styles.metaPill}>
                  <Icon name="school-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.metaPillText}>{service.idealFor}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          {service.description && (
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>About this Service</Text>
              <Text style={styles.bodyText}>{service.description}</Text>
            </View>
          )}

          {/* Deliverables */}
          {service.deliverables && service.deliverables.length > 0 && (
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>What You'll Receive</Text>
              {service.deliverables.map((d, i) => (
                <View key={i} style={styles.deliverableRow}>
                  <View style={[styles.checkIcon, { backgroundColor: '#ECFDF5' }]}>
                    <Icon name="check" size={14} color="#059669" />
                  </View>
                  <Text style={styles.deliverableText}>{d}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Info callout */}
          <View style={[styles.infoBox, { backgroundColor: theme.colors.primary + '08', borderColor: theme.colors.primary + '20' }]}>
            <Icon name="information-outline" size={20} color={theme.colors.primary} style={{ marginTop: 2 }} />
            <Text style={[styles.infoText, { color: theme.colors.primary }]}>
              Pricing is based on your specific requirements. After you submit a request, our team will reach out with a customized quote.
            </Text>
          </View>

        </Animated.View>
      </ScrollView>

      {/* Sticky CTA */}
      <Animated.View style={[styles.stickyBar, { opacity: fadeAnim }]}>
        <View style={styles.stickyLeft}>
          <Text style={styles.stickyLabel}>Ready to get started?</Text>
          <Text style={styles.stickySubLabel}>Describe your needs & we'll contact you</Text>
        </View>
        <Button
          mode="contained"
          style={[styles.ctaBtn, { backgroundColor: theme.colors.primary }]}
          contentStyle={{ paddingHorizontal: 12, paddingVertical: 6 }}
          labelStyle={{ fontWeight: '800', fontSize: 14 }}
          onPress={() => navigation.navigate('RequestForm', { serviceId: service._id, serviceName: service.name })}
        >
          Request →
        </Button>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#94A3B8', fontSize: 16, marginTop: 12 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  backBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  heroCard: { borderRadius: 24, padding: 24, marginBottom: 16, overflow: 'hidden', position: 'relative', shadowColor: '#1E1B4B', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 6 },
  heroOrb: { position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(245,158,11,0.18)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  heroBadgeText: { fontSize: 12, color: '#F59E0B', fontWeight: '700' },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', lineHeight: 32, marginBottom: 8, letterSpacing: -0.3 },
  heroDesc: { fontSize: 14, color: 'rgba(255,255,255,0.78)', lineHeight: 21, marginBottom: 16 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  metaPillText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#1E1B4B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 14 },
  bodyText: { fontSize: 15, color: '#475569', lineHeight: 25 },
  deliverableRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  checkIcon: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  deliverableText: { fontSize: 14, color: '#334155', fontWeight: '500', flex: 1 },
  infoBox: { flexDirection: 'row', gap: 12, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 4 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '500' },
  stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 12 },
  stickyLeft: { flex: 1, marginRight: 12 },
  stickyLabel: { fontSize: 14, fontWeight: '800', color: '#1E1B4B' },
  stickySubLabel: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  ctaBtn: { borderRadius: 14, shadowColor: '#4338CA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
