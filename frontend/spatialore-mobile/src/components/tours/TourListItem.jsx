import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

export default function TourListItem({ tour, onSelect }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onSelect(tour)}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>{tour.name}</Text>
      </View>

      <Text style={styles.location}>
        📍 {tour.city}{tour.country ? `, ${tour.country}` : ''}
      </Text>

      {Boolean(tour.description) && (
        <Text style={styles.description} numberOfLines={3}>
          {tour.description}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardPressed: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    fontSize: 18,
  },
  location: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
