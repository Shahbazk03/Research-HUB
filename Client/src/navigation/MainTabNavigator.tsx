import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import { MainTabParamList } from './types';
import { HomeStackNavigator } from './HomeStackNavigator';
import { RequestsStackNavigator } from './RequestsStackNavigator';
import { AdminStackNavigator } from './AdminStackNavigator';
import { ProfileScreen } from '../screens/dashboard/ProfileScreen';
import { AuthContext } from '../context/AuthContext';

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabBarStyle = {
  backgroundColor: '#FFFFFF',
  borderTopWidth: 0,
  elevation: 24,
  shadowColor: '#1E1B4B',
  shadowOffset: { width: 0, height: -8 },
  shadowOpacity: 0.08,
  shadowRadius: 24,
  height: 64,
  paddingBottom: 10,
  paddingTop: 6,
};

const tabBarLabelStyle = { fontSize: 11, fontWeight: '700' as const };

// ─── Customer Tab Navigator ────────────────────────────────────────────────

const CustomerTab = createBottomTabNavigator();

export const CustomerTabNavigator = () => {
  const theme = useTheme();
  return (
    <CustomerTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle,
        tabBarLabelStyle,
      }}
    >
      <CustomerTab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color, size }) => <Icon name="compass-outline" color={color} size={size} />,
        }}
      />
      <CustomerTab.Screen
        name="RequestsTab"
        component={RequestsStackNavigator}
        options={{
          tabBarLabel: 'Requests',
          tabBarIcon: ({ color, size }) => <Icon name="clipboard-list-outline" color={color} size={size} />,
        }}
      />
      <CustomerTab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Icon name="account-circle-outline" color={color} size={size} />,
        }}
      />
    </CustomerTab.Navigator>
  );
};

// ─── Admin Tab Navigator ───────────────────────────────────────────────────

const AdminTab = createBottomTabNavigator();

export const AdminTabNavigator = () => {
  const theme = useTheme();
  return (
    <AdminTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.secondary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle,
        tabBarLabelStyle,
      }}
    >
      <AdminTab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color, size }) => <Icon name="compass-outline" color={color} size={size} />,
        }}
      />
      <AdminTab.Screen
        name="AdminTab"
        component={AdminStackNavigator}
        options={{
          tabBarLabel: 'Admin',
          tabBarIcon: ({ color, size }) => <Icon name="shield-crown-outline" color={color} size={24} />,
          tabBarActiveTintColor: '#7C3AED',
        }}
      />
      <AdminTab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Icon name="account-circle-outline" color={color} size={size} />,
        }}
      />
    </AdminTab.Navigator>
  );
};

// ─── Root: picks navigator based on role ──────────────────────────────────

export const MainTabNavigator = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'ADMIN';
  return isAdmin ? <AdminTabNavigator /> : <CustomerTabNavigator />;
};
