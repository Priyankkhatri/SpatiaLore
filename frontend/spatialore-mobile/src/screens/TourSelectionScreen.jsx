import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

export default function TourSelectionScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={typography.title}>Select a Tour</Text>
      <Text style={styles.infoText}>
        No tours loaded yet — Supabase read-only integration comes in Phase 3.2/3.3.
      </Text>

      {/* TODO(Phase 3.3): remove this dev-only navigation shortcut once real tour selection exists */}
      <TouchableOpacity
        style={styles.devButton}
        onPress={() => navigation.navigate('TourDownload')}
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
