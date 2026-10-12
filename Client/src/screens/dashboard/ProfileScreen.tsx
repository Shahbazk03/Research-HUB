import React, { useContext } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const ACCOUNT_ITEMS = [
  { icon: 'email-outline', label: 'Email', field: 'email' as const },
  { icon: 'phone-outline', label: 'Phone', field: 'phone' as const },
  { icon: 'shield-account-outline', label: 'Role', field: 'role' as const },
  { icon: 'check-circle-outline', label: 'Status', field: 'status' as const },
];

export const ProfileScreen = () => {
  const { user, logout } = useContext(AuthContext);
  const theme = useTheme();

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';
  const initials = `${user.firstName.charAt(0)}${user.lastName ? user.lastName.charAt(0) : ''}`.toUpperCase();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header / Avatar */}
      <View style={[styles.header, { backgroundColor: isAdmin ? theme.colors.secondary : theme.colors.primary }]}>
        <View style={styles.headerGloss} />
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { borderColor: 'rgba(255,255,255,0.4)' }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Icon name="shield-crown" size={14} color="#FFFFFF" />
            </View>
          )}
        </View>
        <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
        <View style={styles.rolePill}>
          <Icon name={isAdmin ? 'shield-crown-outline' : 'account-outline'} size={12} color="rgba(255,255,255,0.9)" />
          <Text style={styles.rolePillText}>{user.role}</Text>
        </View>
      </View>

      {/* Info Cards */}
      <View style={styles.cardsContainer}>
        <View style={styles.infoCard}>
          <Text style={[styles.cardSectionTitle, { color: theme.colors.secondary }]}>Account Details</Text>
          {ACCOUNT_ITEMS.map(item => {
            const value = user[item.field];
            if (!value) return null;
            return (
              <View key={item.field} style={styles.infoRow}>
                <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                  <Icon name={item.icon} size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{String(value)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Member since */}
        <View style={[styles.memberCard, { borderColor: theme.colors.primary + '20', backgroundColor: theme.colors.primary + '06' }]}>
          <Icon name="calendar-star" size={22} color={theme.colors.primary} />
          <Text style={[styles.memberText, { color: theme.colors.primary }]}>
            Research Hub Member
          </Text>
        </View>

        {/* Logout */}
        <Button
          mode="outlined"
          onPress={logout}
          style={styles.logoutButton}
          labelStyle={[styles.logoutLabel, { color: theme.colors.error }]}
          textColor={theme.colors.error}
          icon="logout"
        >
          Sign Out
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 56,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 24,
  },
  headerGloss: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  avatarContainer: { marginBottom: 16, position: 'relative' },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 34, fontWeight: '900', color: '#FFFFFF' },
  adminBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#7C3AED',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 24, fontWeight: '900', color: '#FFFFFF',
    marginBottom: 10, letterSpacing: -0.3,
  },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
  },
  rolePillText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  cardsContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 12,
    elevation: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)',
  },
  cardSectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 14,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#1E1B4B', fontWeight: '600' },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 16,
    marginBottom: 24,
  },
  memberText: { fontSize: 15, fontWeight: '700' },
  logoutButton: {
    borderRadius: 14, borderWidth: 1.5, borderColor: '#EF4444',
    paddingVertical: 4,
  },
  logoutLabel: { fontSize: 15, fontWeight: '800' },
});
