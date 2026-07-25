import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TourSelectionScreen from '../screens/TourSelectionScreen';
import TourDownloadScreen from '../screens/TourDownloadScreen';
import ActiveTourScreen from '../screens/ActiveTourScreen';
import TourEndScreen from '../screens/TourEndScreen';
import { colors } from '../constants/theme';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="TourSelection"
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '700',
        },
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="TourSelection"
        component={TourSelectionScreen}
        options={{ title: 'SpatiaLore Audio Tours' }}
      />
      <Stack.Screen
        name="TourDownload"
        component={TourDownloadScreen}
        options={{ title: 'Downloading Tour' }}
      />
      <Stack.Screen
        name="ActiveTour"
        component={ActiveTourScreen}
        options={{ headerShown: false }} // Hands-free screen-off mode header disabled
      />
      <Stack.Screen
        name="TourEnd"
        component={TourEndScreen}
        options={{ title: 'Tour Summary' }}
      />
    </Stack.Navigator>
  );
}
