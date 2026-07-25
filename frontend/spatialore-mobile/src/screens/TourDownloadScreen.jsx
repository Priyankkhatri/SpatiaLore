import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

export default function TourDownloadScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={typography.title}>Downloading Tour...</Text>
      <Text style={styles.infoText}>
        This screen will display real-time offline caching progress for POIs and scripts in Phase 3.3/3.4.
      </Text>

      {/* TODO(Phase 3.3): remove this dev-only navigation shortcut once real tour downloading exists */}
      <TouchableOpacity
        style={styles.devButton}
        onPress={() => navigation.navigate('ActiveTour')}
      >
        <Text style={styles.devButtonText}>Continue (Dev Only)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    ...typography.subtitle,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  devButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  devButtonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 16,
  },
});
