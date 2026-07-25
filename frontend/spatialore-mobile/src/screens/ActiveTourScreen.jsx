import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestLocationPermissions } from '../lib/geolocation/locationPermissions';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
} from '../lib/geolocation/geolocationService';
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

  useEffect(() => {
    let isMounted = true;
    let pollInterval = null;

    async function initTracking() {
      // 1. Request location permissions
      const permResult = await requestLocationPermissions();
      if (!isMounted) return;

      setPermissions(permResult);

      if (permResult.foregroundGranted) {
        // 2. Start background location tracking
        await startBackgroundTracking();
        if (isMounted) setTrackingStarted(true);

        // 3. Poll AsyncStorage for latest background coordinates (debug UI)
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
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  const handleEndTour = async () => {
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
          {trackingStarted ? '🟢 Location Tracking Active' : '🟡 Initializing Sensors...'}
        </Text>

        {/* TODO(Phase 4.2): Remove debug coordinate display once real geofence trigger UI is live */}
        <View style={styles.debugBox}>
          <Text style={styles.debugTitle}>DEV DEBUG — CURRENT LOCATION</Text>
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
    justifyContent: 'space-between',
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
    marginBottom: spacing.md,
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
    padding: spacing.lg,
    alignItems: 'center',
  },
  tourTitle: {
    ...typography.title,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  tourStatus: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  debugBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  debugTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  debugCoords: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'monospace',
    lineHeight: 18,
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
