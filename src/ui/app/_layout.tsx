import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ViolationContextProvider } from '@/context/violation-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ViolationContextProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="create-ticket" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="map-selection" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="plate-camera" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="number-plate-fail" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="plate-retake" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="wide-photo" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="signs-selection" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="signs-camera" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="signs-camera2" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="violation-reason" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="waiting-confirmation" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="confirm-photo" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="final-success" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="alternative-success" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ViolationContextProvider>
  );
}
