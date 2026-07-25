import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestLocationPermissions } from '../lib/geolocation/locationPermissions';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
} from '../lib/geolocation/geolocationService';
import { setActiveTourId, clearActiveTourId } from '../lib/geolocation/activeSession';
import { subscribeTriggerEvents } from '../lib/geolocation/triggerEventBus';
import { useActiveTour } from '../context/ActiveTourContext';
import { colors, spacing, typography } from '../constants/theme';

export default function ActiveTourScreen({ navigation }) {
  const { selectedTour } = useActiveTour();

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

    // 1. Subscribe to geofence trigger events emitted from background locationTask
    const unsubscribeTriggers = subscribeTriggerEvents((event) => {
      if (isMounted) {
        setTriggeredPois((prev) => [
          { poi: event, timestamp: new Date().toISOString() },
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
        // 4. Start background location tracking
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
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [selectedTour?.id]);

  const handleEndTour = async () => {
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
          {trackingStarted ? '🟢 Listening for Geofence Triggers...' : '🟡 Initializing Sensors...'}
        </Text>

        {/* Debug Coordinate Display */}
        <View style={styles.debugBox}>
          <Text style={styles.debugTitle}>DEV DEBUG — CURRENT GPS POSITION</Text>
          {lastLocation ? (
            <Text style={styles.debugCoords}>
              Lat: {lastLocation.latitude.toFixed(5)} | Lng: {lastLocation.longitude.toFixed(5)}{'\n'}
              Accuracy: ±{lastLocation.accuracy?.toFixed(1)}m | Updated: {new Date(lastLocation.timestamp).toLocaleTimeString()}
            </Text>
          ) : (
            <Text style={styles.debugCoords}>Waiting for initial GPS fix...</Text>
          )}
        </View>
      </View>

      {/* Trigger Event Log Display */}
      <View style={styles.triggerLogContainer}>
        {/* TODO(Phase 5): Replace debug trigger log with real narration player UI */}
        <Text style={styles.triggerLogTitle}>
          🎯 TRIGGERED POIs ({triggeredPois.length})
        </Text>

        {triggeredPois.length === 0 ? (
          <View style={styles.emptyTriggerBox}>
            <Text style={styles.emptyTriggerText}>
              No POIs triggered yet. Walk within a POI's radius (e.g. Amber Fort) to fire a narration trigger.
            </Text>
          </View>
        ) : (
          <FlatList
            data={triggeredPois}
            keyExtractor={(item, index) => `${item.poi.id}-${index}`}
            renderItem={({ item }) => (
              <View style={styles.triggerCard}>
                <View style={styles.triggerCardRow}>
                  <Text style={styles.triggerPoiName}>{item.poi.name}</Text>
                  <Text style={styles.triggerBadge}>TRIGGERED</Text>
                </View>
                <Text style={styles.triggerDetails}>
                  Distance: {item.poi.distanceMeters?.toFixed(1)}m | Trigger Radius: {item.poi.trigger_radius_m}m
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
