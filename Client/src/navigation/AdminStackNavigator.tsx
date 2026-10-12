import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import { AdminStackParamList } from './types';
import { AdminRequestsScreen } from '../screens/admin/AdminRequestsScreen';
import { AdminRequestDetailScreen } from '../screens/admin/AdminRequestDetailScreen';

const Stack = createNativeStackNavigator<AdminStackParamList>();

export const AdminStackNavigator = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.secondary },
        headerTitleStyle: { fontWeight: '700', color: '#FFFFFF' },
        headerTintColor: '#FFFFFF',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="AdminRequests" component={AdminRequestsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AdminRequestDetail" component={AdminRequestDetailScreen} options={{ title: 'Request Detail' }} />
    </Stack.Navigator>
  );
};
