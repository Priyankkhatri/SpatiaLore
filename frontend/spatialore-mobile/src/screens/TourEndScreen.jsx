/**
 * End-of-Tour Summary & Feedback Screen for SpatiaLore.
 * Displays tour listening recap, captures anonymous 1-5 star ratings,
 * and handles clean session reset.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import StarRating from '../components/tours/StarRating';
import { useActiveTour } from '../context/ActiveTourContext';
import { recordFeedbackSubmitted } from '../lib/analytics/analyticsEvents';
import { colors, spacing, typography } from '../constants/theme';

export default function TourEndScreen({ navigation }) {
  const { selectedTour, playbackHistory, resetActiveTour } = useActiveTour();

  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Compute story recap breakdown from playbackHistory
  const playedCount = (playbackHistory || []).filter(
    (item) => item.status === 'played'
  ).length;
  const skippedCount = (playbackHistory || []).filter(
    (item) => item.status === 'skipped'
  ).length;

  // Intercept back navigation gestures/buttons to avoid returning to a torn-down tour
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // If we are navigating forward to TourSelection after reset, allow default action
      if (e.data.action.type === 'RESET' || e.data.action.type === 'POP_TO_TOP') {
        return;
      }
      e.preventDefault();
      resetActiveTour();
      navigation.reset({
        index: 0,
        routes: [{ name: 'TourSelection' }],
      });
    });

    return unsubscribe;
  }, [navigation, resetActiveTour]);

  const handleFinish = () => {
    resetActiveTour();
    navigation.reset({
      index: 0,
      routes: [{ name: 'TourSelection' }],
    });
  };

  const handleSubmitFeedback = async () => {
    if (rating === 0 || submitting) return;

    setSubmitting(true);
    if (selectedTour?.id) {
      await recordFeedbackSubmitted(selectedTour.id, rating);
    }

    setSubmitted(true);

    // Show brief thanks feedback toast before returning to home
    setTimeout(() => {
      handleFinish();
    }, 900);
  };

  const handleSkipFeedback = () => {
    if (submitting) return;
    setSubmitting(true);
    handleFinish();
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.headerEmoji}>🎉</Text>
        <Text style={styles.title}>Tour Complete!</Text>
        <Text style={styles.tourName}>{selectedTour?.name || 'SpatiaLore Tour'}</Text>

        {/* Story Listening Summary */}
        <View style={styles.summaryBox}>
          {playedCount > 0 ? (
            <Text style={styles.summaryText}>
              🎧 You heard <Text style={styles.highlightText}>{playedCount}</Text>{' '}
              {playedCount === 1 ? 'story' : 'stories'} on this tour
              {skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}.
            </Text>
          ) : (
            <Text style={styles.summaryMuted}>
              No stories were triggered on this tour.
            </Text>
          )}
        </View>

        {/* Feedback Section */}
        {submitted ? (
          <View style={styles.thanksBox}>
            <Text style={styles.thanksTitle}>Thanks for your feedback! 🙏</Text>
            <Text style={styles.thanksSubtext}>
              Your rating helps improve tour experiences for fellow travelers.
            </Text>
          </View>
        ) : (
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackPrompt}>How was your tour?</Text>

            <StarRating value={rating} onChange={setRating} size={38} />

            <TouchableOpacity
              style={[
                styles.submitButton,
                (rating === 0 || submitting) && styles.buttonDisabled,
              ]}
              disabled={rating === 0 || submitting}
              onPress={handleSubmitFeedback}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              disabled={submitting}
              onPress={handleSkipFeedback}
            >
              <Text style={styles.skipButtonText}>Skip Feedback</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 42,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  tourName: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  summaryBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  summaryText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  summaryMuted: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  highlightText: {
    color: colors.primary,
    fontWeight: '700',
  },
  feedbackSection: {
    width: '100%',
    alignItems: 'center',
  },
  feedbackPrompt: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  submitButton: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  submitButtonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  thanksBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    width: '100%',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  thanksTitle: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  thanksSubtext: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
