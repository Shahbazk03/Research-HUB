import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import { RequestsStackParamList } from './types';
import { MyRequestsScreen } from '../screens/dashboard/MyRequestsScreen';
import { RequestDetailScreen } from '../screens/home/RequestDetailScreen';

const Stack = createNativeStackNavigator<RequestsStackParamList>();

export const RequestsStackNavigator = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTitleStyle: { fontWeight: '700', color: theme.colors.secondary },
        headerTintColor: theme.colors.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="MyRequests" component={MyRequestsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RequestDetail" component={RequestDetailScreen} options={{ title: 'Request Details' }} />
    </Stack.Navigator>
  );
};
