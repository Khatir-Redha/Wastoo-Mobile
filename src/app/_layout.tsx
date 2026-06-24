import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

// Import the LoginScreen (update this path to match where you saved the file)
import LoginScreen from './login'; 

import "../global.css"

export default function TabLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Temporarily rendering ONLY the LoginScreen for UI testing */}
      <LoginScreen />
    </ThemeProvider>
  );
}