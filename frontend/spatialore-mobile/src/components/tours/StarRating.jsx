/**
 * Interactive 1-5 Star Rating Component for SpatiaLore.
 * Pure controlled UI component with no analytics or context side-effects.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing } from '../../constants/theme';

export default function StarRating({ value = 0, onChange, size = 36 }) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.container}>
      {stars.map((starNumber) => {
        const isFilled = starNumber <= value;
        return (
          <TouchableOpacity
            key={starNumber}
            activeOpacity={0.7}
            onPress={() => typeof onChange === 'function' && onChange(starNumber)}
            style={styles.starButton}
            accessibilityLabel={`Rate ${starNumber} out of 5 stars`}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.starText,
                { fontSize: size },
                isFilled ? styles.starFilled : styles.starUnfilled,
              ]}
            >
              {isFilled ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  starButton: {
    padding: spacing.xs,
    marginHorizontal: 4,
  },
  starText: {
    textAlign: 'center',
  },
  starFilled: {
    color: colors.warning || '#f59e0b',
  },
  starUnfilled: {
    color: colors.border || '#64748b',
  },
});
