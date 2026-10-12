import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import { HomeStackParamList } from './types';
import { HomeScreen } from '../screens/home/HomeScreen';
import { CategoryListScreen } from '../screens/home/CategoryListScreen';
import { ServiceListScreen } from '../screens/home/ServiceListScreen';
import { ServiceDetailScreen } from '../screens/home/ServiceDetailScreen';
import { RequestFormScreen } from '../screens/home/RequestFormScreen';
import { RequestDetailScreen } from '../screens/home/RequestDetailScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export const HomeStackNavigator = () => {
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
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Research Hub', headerShown: false }} />
      <Stack.Screen name="CategoryList" component={CategoryListScreen} options={({ route }) => ({ title: route.params.domainName, headerShown: false })} />
      <Stack.Screen name="ServiceList" component={ServiceListScreen} options={({ route }) => ({ title: route.params.categoryName, headerShown: false })} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} options={({ route }) => ({ title: route.params.serviceTitle, headerLargeTitle: false })} />
      <Stack.Screen name="RequestForm" component={RequestFormScreen} options={{ title: 'Request Service' }} />
      <Stack.Screen name="RequestDetail" component={RequestDetailScreen} options={{ title: 'Request Details' }} />
    </Stack.Navigator>
  );
};
