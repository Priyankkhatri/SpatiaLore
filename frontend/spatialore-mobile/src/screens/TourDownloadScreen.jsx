import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorBanner from '../components/common/ErrorBanner';
import { useActiveTour } from '../context/ActiveTourContext';
import { clearTriggerStateForTour } from '../lib/storage/tourCacheApi';
import { colors, spacing, typography } from '../constants/theme';

export default function TourDownloadScreen({ navigation }) {
  const {
    selectedTour,
    pois,
    scripts,
    downloadStatus,
    downloadError,
    downloadTour,
    resetActiveTour,
  } = useActiveTour();

  const handleCancel = () => {
    resetActiveTour();
    navigation.navigate('TourSelection');
  };

  const handleStartTour = async () => {
    if (selectedTour) {
      // Clear previous trigger history for a fresh session restart
      await clearTriggerStateForTour(selectedTour.id);
    }
    navigation.navigate('ActiveTour');
  };

  const handleRetry = () => {
    if (selectedTour) {
      downloadTour(selectedTour);
    }
  };

  if (downloadStatus === 'downloading' || downloadStatus === 'idle') {
    return (
      <View style={styles.centerContainer}>
        <LoadingIndicator
          label={`Downloading ${selectedTour?.name || 'Tour'}...`}
        />
        <Text style={styles.downloadSubtext}>
          Fetching points of interest and narration scripts for offline use.
        </Text>
      </View>
    );
  }

  if (downloadStatus === 'error') {
    return (
      <View style={styles.container}>
        <Text style={typography.title}>Download Failed</Text>
        <ErrorBanner message={downloadError} onRetry={handleRetry} />

        <TouchableOpacity style={styles.secondaryButton} onPress={handleCancel}>
          <Text style={styles.secondaryButtonText}>Choose Different Tour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // State: downloadStatus === 'ready'
  const scriptCount = scripts.length;
  const poiCount = pois.length;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.tourTitle}>{selectedTour?.name}</Text>
        <Text style={styles.tourLocation}>
          📍 {selectedTour?.city}{selectedTour?.country ? `, ${selectedTour?.country}` : ''}
        </Text>

        {selectedTour?.description && (
          <Text style={styles.tourDescription}>{selectedTour.description}</Text>
        )}

        <View style={styles.statusBox}>
          {poiCount === 0 ? (
            <Text style={styles.warningText}>
              ⚠️ This tour has no points of interest yet.
            </Text>
          ) : (
            <Text style={styles.statusText}>
              ✓ {scriptCount} of {poiCount} POIs have narration ready for playback.
            </Text>
          )}
        </View>

        {poiCount > 0 ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleStartTour}>
            <Text style={styles.primaryButtonText}>Start Tour 🎧</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.secondaryButton} onPress={handleCancel}>
          <Text style={styles.secondaryButtonText}>Cancel / Choose Different Tour</Text>
        </TouchableOpacity>
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
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  downloadSubtext: {
    ...typography.subtitle,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
  },
  tourTitle: {
    ...typography.title,
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  tourLocation: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  tourDescription: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  statusBox: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  statusText: {
    color: colors.success,
    fontWeight: '600',
    fontSize: 14,
  },
  warningText: {
    color: colors.warning,
    fontWeight: '600',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryButtonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
});
