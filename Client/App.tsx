import React from 'react';
import { DefaultTheme, Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4338CA', // Electric Indigo
    secondary: '#1E1B4B', // Deep Indigo
    tertiary: '#10B981', // Soft Mint
    background: '#F8FAFC', // Elegant off-white
    surface: '#FFFFFF',
    error: '#EF4444',
  },
  roundness: 12, // More rounded corners globally
};

export default function App() {
  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <RootNavigator />
      </PaperProvider>
    </AuthProvider>
  );
}
