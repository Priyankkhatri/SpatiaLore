import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

export default function ActiveTourScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={typography.title}>Tour Active 🎧</Text>
      <Text style={styles.infoText}>
        Hands-free screen-off mode. Background geofencing and native TTS playback will execute here in Phases 4 & 5.
      </Text>

      {/* TODO(Phase 4/5): remove this dev-only shortcut once real tour tracking is complete */}
      <TouchableOpacity
        style={styles.devButton}
        onPress={() => navigation.navigate('TourEnd')}
      >
        <Text style={styles.devButtonText}>End Tour (Dev Only)</Text>
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
    backgroundColor: colors.error,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  devButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});
