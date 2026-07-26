import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorBanner from '../components/common/ErrorBanner';
import { useActiveTour } from '../context/ActiveTourContext';
import {
  clearTourSessionState,
  verifyTourCacheIntegrity,
} from '../lib/storage/tourCacheApi';
import { setTtsLanguage } from '../lib/audio/ttsEngine';

const LANGUAGE_LABELS = {
  en: 'English 🇺🇸',
  hi: 'Hindi 🇮🇳 (हिंदी)',
  fr: 'French 🇫🇷 (Français)',
  es: 'Spanish 🇪🇸 (Español)',
  de: 'German 🇩🇪 (Deutsch)',
};

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

  const [selectedLang, setSelectedLang] = useState('en');
  const [voiceWarning, setVoiceWarning] = useState(null);
  const [integrityState, setIntegrityState] = useState({
    checked: false,
    isValid: true,
    issues: [],
  });

  const supportedLanguages = selectedTour?.supported_languages || ['en'];

  const handleSelectLanguage = async (code) => {
    setSelectedLang(code);
    const { isVoiceAvailable } = await setTtsLanguage(code);

    if (!isVoiceAvailable && code !== 'en') {
      const langName = LANGUAGE_LABELS[code] || code;
      setVoiceWarning(
        `The ${langName} voice isn't installed on this device. You can install it in your device settings, or continue in English.`
      );
    } else {
      setVoiceWarning(null);
    }
  };

  const handleCancel = () => {
    resetActiveTour();
    navigation.navigate('TourSelection');
  };

  const handleStartTour = async () => {
    if (selectedTour) {
      await clearTourSessionState(selectedTour.id);
    }
    navigation.navigate('ActiveTour');
  };

  const handleRetry = () => {
    if (selectedTour) {
      downloadTour(selectedTour, selectedLang);
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

  // State: Cache Integrity Failure on Resume
  if (integrityState.checked && !integrityState.isValid) {
    return (
      <View style={styles.container}>
        <Text style={typography.title}>Tour Data Corrupted ⚠️</Text>
        <ErrorBanner
          message="Some downloaded tour data appears to be missing or corrupted. Please redownload to continue."
          onRetry={handleRetry}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
          <Text style={styles.primaryButtonText}>Redownload Tour Data 🔄</Text>
        </TouchableOpacity>

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

        {/* Multi-Language Selection Section */}
        {supportedLanguages.length > 1 && (
          <View style={styles.langSection}>
            <Text style={styles.langHeader}>Select Narration Language:</Text>
            <View style={styles.langRow}>
              {supportedLanguages.map((code) => {
                const isSelected = selectedLang === code;
                return (
                  <TouchableOpacity
                    key={code}
                    style={[styles.langChip, isSelected && styles.langChipSelected]}
                    onPress={() => handleSelectLanguage(code)}
                  >
                    <Text
                      style={[
                        styles.langChipText,
                        isSelected && styles.langChipTextSelected,
                      ]}
                    >
                      {LANGUAGE_LABELS[code] || code.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {voiceWarning && (
          <View style={styles.voiceWarningBox}>
            <Text style={styles.voiceWarningText}>⚠️ {voiceWarning}</Text>
          </View>
        )}

        <View style={styles.statusBox}>
          {poiCount === 0 ? (
            <Text style={styles.warningText}>
              ⚠️ This tour has no points of interest yet.
            </Text>
          ) : (
            <Text style={styles.statusText}>
              ✓ {scriptCount} of {poiCount} POIs have narration ready for playback ({selectedLang.toUpperCase()}).
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
  langSection: {
    marginBottom: spacing.md,
  },
  langHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  langChipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  langChipTextSelected: {
    color: '#0f172a',
    fontWeight: '700',
  },
  voiceWarningBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  voiceWarningText: {
    color: colors.warning,
    fontSize: 13,
    lineHeight: 18,
  },
});
