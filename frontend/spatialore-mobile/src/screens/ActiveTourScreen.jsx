import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestLocationPermissions } from '../lib/geolocation/locationPermissions';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
} from '../lib/geolocation/geolocationService';
import { setActiveTourId, clearActiveTourId } from '../lib/geolocation/activeSession';
import {
  subscribeTriggerEvents,
  subscribePrefetchEvents,
} from '../lib/geolocation/triggerEventBus';
import RetryToast from '../components/common/RetryToast';
import { colors, spacing, typography } from '../constants/theme';

export default function ActiveTourScreen({ navigation }) {
  const {
    selectedTour,
    hotScripts,
    currentlyPlaying,
    narrationQueue,
    playbackHistory,
    isTtsAvailable,
    isPaused,
    retryToast,
    retryFailedNarration,
    dismissRetryToast,
    pauseCurrentNarration,
    resumeCurrentNarration,
    skipCurrentNarration,
    stopCurrentNarration,
  } = useActiveTour();

  const [permissions, setPermissions] = useState({
    foregroundGranted: null,
    backgroundGranted: null,
  });
  const [lastLocation, setLastLocation] = useState(null);
  const [trackingStarted, setTrackingStarted] = useState(false);
  const [triggeredPois, setTriggeredPois] = useState([]);

  useEffect(() => {
    let isMounted = true;
    let pollInterval = null;

    // 1a. Subscribe to geofence trigger events emitted from background locationTask
    const unsubscribeTriggers = subscribeTriggerEvents((event) => {
      if (isMounted) {
        setTriggeredPois((prev) => [
          { poi: event, type: 'trigger', timestamp: new Date().toISOString() },
          ...prev,
        ]);
      }
    });

    // 1b. Subscribe to prefetch zone events (early warning)
    const unsubscribePrefetch = subscribePrefetchEvents((event) => {
      if (isMounted) {
        setTriggeredPois((prev) => [
          { poi: event, type: 'prefetch', timestamp: new Date().toISOString() },
          ...prev,
        ]);
      }
    });

    async function initTracking() {
      // 2. Set active tour session ID for background task lookup
      if (selectedTour?.id) {
        await setActiveTourId(selectedTour.id);
      }

      // 3. Request location permissions
      const permResult = await requestLocationPermissions();
      if (!isMounted) return;

      setPermissions(permResult);

      if (permResult.foregroundGranted) {
        // 4. Start background location tracking & PDR sensors
        await startBackgroundTracking();
        if (isMounted) setTrackingStarted(true);

        // 5. Poll AsyncStorage for latest background coordinates (debug display)
        pollInterval = setInterval(async () => {
          try {
            const raw = await AsyncStorage.getItem('@spatialore_last_location');
            if (raw && isMounted) {
              setLastLocation(JSON.parse(raw));
            }
          } catch (err) {
            console.warn('Error reading debug location:', err);
          }
        }, 2000);
      }
    }

    initTracking();

    return () => {
      isMounted = false;
      unsubscribeTriggers();
      unsubscribePrefetch();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [selectedTour?.id]);

  const handleEndTour = async () => {
    stopCurrentNarration();
    await clearActiveTourId();
    await stopBackgroundTracking();
    navigation.navigate('TourEnd');
  };

  // State 1: Permissions still checking
  if (permissions.foregroundGranted === null) {
    return (
      <View style={styles.centerContainer}>
        <Text style={typography.subtitle}>Requesting location permissions...</Text>
      </View>
    );
  }

  // State 2: Foreground permission denied (Blocking)
  if (permissions.foregroundGranted === false) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Location Access Required 📍</Text>
          <Text style={styles.errorText}>
            SpatiaLore needs location access to trigger audio narration as you walk near points of interest. Please enable location access in device Settings.
          </Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('TourSelection')}
          >
            <Text style={styles.secondaryButtonText}>Return to Tour Selection</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* TTS Engine Unavailable Warning */}
      {!isTtsAvailable && (
        <View style={[styles.warningBanner, { borderColor: colors.error, backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
          <Text style={[styles.warningText, { color: colors.error }]}>
            ⚠️ Text-To-Speech engine is unavailable on this device. Audio narration cannot be played.
          </Text>
        </View>
      )}

      {/* Degraded Mode Warning if background permission denied */}
      {permissions.backgroundGranted === false && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ Background location isn't enabled — narration will only play while the app remains open. Enable "Always Allow" in Settings for hands-free screen-off mode.
          </Text>
        </View>
      )}

      <View style={styles.tourHeaderCard}>
        <Text style={styles.tourTitle}>{selectedTour?.name || 'Active Tour'}</Text>
        <Text style={styles.tourStatus}>
          {trackingStarted
            ? lastLocation?.isPdr
              ? '🧭 PDR Dead-Reckoning Active (GPS Degraded)'
              : '🟢 GPS Location Tracking Active'
            : '🟡 Initializing Sensors...'}
        </Text>

        {/* Debug Coordinate & Sensor Display */}
        <View style={styles.debugBox}>
          <Text style={styles.debugTitle}>
            DEV DEBUG — {lastLocation?.isPdr ? 'PDR ESTIMATED POSITION' : 'CURRENT GPS POSITION'}
          </Text>
          {lastLocation ? (
            <Text style={styles.debugCoords}>
              Lat: {lastLocation.latitude.toFixed(5)} | Lng: {lastLocation.longitude.toFixed(5)}{'\n'}
              {lastLocation.isPdr
                ? `Steps: ${lastLocation.stepCount || 0} | Compass: ${lastLocation.headingDegrees?.toFixed(0) || 0}°`
                : `Accuracy: ±${lastLocation.accuracy?.toFixed(1)}m | Fix: GPS`}
            </Text>
          ) : (
            <Text style={styles.debugCoords}>Waiting for initial sensor fix...</Text>
          )}
        </View>
      </View>

      {/* Real Narration Player Card (Now Playing & Controls) */}
      {currentlyPlaying ? (
        <View style={styles.nowPlayingCard}>
          <View style={styles.nowPlayingHeader}>
            <Text style={styles.nowPlayingBadge}>🔊 NOW PLAYING</Text>
            {narrationQueue.length > 0 && (
              <View style={styles.queueBadge}>
                <Text style={styles.queueBadgeText}>Up next: {narrationQueue.length} more</Text>
              </View>
            )}
          </View>

          <Text style={styles.nowPlayingPoiName}>{currentlyPlaying.name}</Text>
          <Text style={styles.nowPlayingCategory}>
            Category: {currentlyPlaying.category || 'Landmark'}
          </Text>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.controlButton, styles.pauseButton]}
              onPress={isPaused ? resumeCurrentNarration : pauseCurrentNarration}
              activeOpacity={0.8}
            >
              <Text style={styles.pauseButtonText}>
                {isPaused ? 'Resume ▶️' : 'Pause ⏸️'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.skipButton]}
              onPress={skipCurrentNarration}
              activeOpacity={0.8}
            >
              <Text style={styles.skipButtonText}>Skip ⏭️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={stopCurrentNarration}
              activeOpacity={0.8}
            >
              <Text style={styles.stopButtonText}>Stop 🛑</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : narrationQueue.length > 0 ? (
        <View style={styles.queuedCard}>
          <Text style={styles.queuedText}>
            ⏳ Narration Queue: {narrationQueue.length} POI(s) waiting to play...
          </Text>
        </View>
      ) : null}

      {/* Trigger & Prefetch Event Log Display */}
      <View style={styles.triggerLogContainer}>
        <Text style={styles.triggerLogTitle}>
          📜 PLAYBACK & GEOFENCE LOG ({playbackHistory.length}) | HOT CACHE ({Object.keys(hotScripts || {}).length})
        </Text>

        {playbackHistory.length === 0 && triggeredPois.length === 0 ? (
          <View style={styles.emptyTriggerBox}>
            <Text style={styles.emptyTriggerText}>
              No narration played yet. Walk near a POI (e.g. Amber Fort) to trigger audio playback automatically.
            </Text>
          </View>
        ) : (
          <FlatList
            data={
              playbackHistory.length > 0
                ? playbackHistory
                : triggeredPois.map((item) => ({
                    poi: item.poi,
                    status: item.type === 'prefetch' ? 'prefetched' : 'triggered',
                    timestamp: item.timestamp,
                  }))
            }
            keyExtractor={(item, index) => `${item.poi.id}-${index}`}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.triggerCard,
                  item.status === 'prefetched' && styles.prefetchCard,
                  item.status === 'no_script_available' && styles.errorHistoryCard,
                ]}
              >
                <View style={styles.triggerCardRow}>
                  <Text style={styles.triggerPoiName}>{item.poi.name}</Text>
                  <Text
                    style={[
                      styles.triggerBadge,
                      item.status === 'prefetched' && styles.prefetchBadge,
                      item.status === 'no_script_available' && styles.errorBadge,
                    ]}
                  >
                    {item.status === 'played'
                      ? '✅ SPOKEN'
                      : item.status === 'no_script_available'
                      ? '⚠️ NO SCRIPT'
                      : item.status === 'prefetched'
                      ? '🚀 PREFETCHED'
                      : '🎯 TRIGGERED'}
                  </Text>
                </View>
                <Text style={styles.triggerDetails}>
                  {item.status === 'no_script_available'
                    ? `No narration script available for "${item.poi.name}"`
                    : `Distance: ${item.poi.distanceMeters?.toFixed(1) || '--'}m`}
                </Text>
                <Text style={styles.triggerTime}>
                  Time: {new Date(item.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            )}
          />
        )}
      </View>

      <TouchableOpacity style={styles.endTourButton} onPress={handleEndTour}>
        <Text style={styles.endTourButtonText}>End Tour 🛑</Text>
      </TouchableOpacity>

      {/* Non-Blocking Retry Toast for Transient TTS Engine Failures */}
      {retryToast && (
        <RetryToast
          message={retryToast.message}
          onRetry={retryFailedNarration}
          onDismiss={dismissRetryToast}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    paddingVertical: spacing.xl,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  warningText: {
    color: colors.warning,
    fontSize: 13,
    lineHeight: 18,
  },
  tourHeaderCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tourTitle: {
    ...typography.title,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 2,
  },
  tourStatus: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  debugBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
  },
  debugTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  debugCoords: {
    fontSize: 11,
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  nowPlayingCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: colors.success,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  nowPlayingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nowPlayingBadge: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  queueBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  queueBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  nowPlayingPoiName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  nowPlayingCategory: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  controlButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pauseButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: colors.warning,
  },
  pauseButtonText: {
    color: colors.warning,
    fontWeight: '700',
    fontSize: 12,
  },
  skipButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: colors.primary,
  },
  skipButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  stopButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.error,
  },
  stopButtonText: {
    color: colors.error,
    fontWeight: '700',
    fontSize: 12,
  },
  queuedCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  queuedText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  errorHistoryCard: {
    borderColor: colors.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  errorBadge: {
    color: colors.warning,
  },
  triggerLogContainer: {
    flex: 1,
    marginBottom: spacing.md,
  },
  triggerLogTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  emptyTriggerBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTriggerText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  triggerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  prefetchCard: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  triggerCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  triggerPoiName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  triggerBadge: {
    color: colors.success,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  prefetchBadge: {
    color: colors.primary,
  },
  triggerDetails: {
    color: colors.textMuted,
    fontSize: 12,
  },
  triggerTime: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
  },
  errorTitle: {
    ...typography.title,
    fontSize: 18,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.subtitle,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  endTourButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  endTourButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
});
