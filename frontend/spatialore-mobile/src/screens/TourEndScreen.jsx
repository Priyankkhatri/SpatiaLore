import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

export default function TourEndScreen({ navigation }) {
  const handleReturnHome = () => {
    // Reset navigation stack back to TourSelection to prevent growing stack on repeated dev test loops
    navigation.popToTop();
  };

  return (
    <View style={styles.container}>
      <Text style={typography.title}>Tour Complete 🎉</Text>
      <Text style={styles.infoText}>
        Feedback collection and analytics submission will occur here in Phase 6.
      </Text>

      <TouchableOpacity style={styles.devButton} onPress={handleReturnHome}>
        <Text style={styles.devButtonText}>Back to Tour Selection</Text>
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
