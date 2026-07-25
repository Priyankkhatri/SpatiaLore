import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ActiveTourProvider } from './src/context/ActiveTourContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initSchema } from './src/lib/storage/db';
import LoadingIndicator from './src/components/common/LoadingIndicator';
import { View, StyleSheet } from 'react-native';
import { colors } from './src/constants/theme';

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    initSchema()
      .then(() => {
        if (isMounted) setDbReady(true);
      })
      .catch((err) => {
        console.error('Failed to initialize local SQLite database:', err);
        if (isMounted) setDbReady(true); // Continue gracefully
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.splashContainer}>
        <LoadingIndicator label="Initializing offline database..." />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ActiveTourProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </ActiveTourProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
