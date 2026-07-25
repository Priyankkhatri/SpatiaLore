import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import TourListItem from '../components/tours/TourListItem';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorBanner from '../components/common/ErrorBanner';
import { fetchPublishedTours } from '../lib/toursApi';
import { getMostRecentCachedTour } from '../lib/storage/tourCacheApi';
import { useActiveTour } from '../context/ActiveTourContext';
import { colors, spacing, typography } from '../constants/theme';

export default function TourSelectionScreen({ navigation }) {
  const { downloadTour, resumeCachedTour } = useActiveTour();

  const [tours, setTours] = useState([]);
  const [cachedBundle, setCachedBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);

    // 1. Check local SQLite for most recently cached tour (works offline)
    try {
      const { data: cached } = await getMostRecentCachedTour();
      setCachedBundle(cached);
    } catch (err) {
      console.warn('Could not read cached tour:', err);
    }

    // 2. Fetch published tours from Supabase (network call)
    const { data, error } = await fetchPublishedTours();

    if (error) {
      setErrorMsg(error.message || 'Failed to load published tours.');
      setTours([]);
    } else {
      setTours(data || []);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setErrorMsg(null);

    try {
      const { data: cached } = await getMostRecentCachedTour();
      setCachedBundle(cached);
    } catch (err) {
      console.warn('Could not read cached tour:', err);
    }

    const { data, error } = await fetchPublishedTours();
    if (error) {
      setErrorMsg(error.message || 'Failed to refresh tours.');
    } else {
      setTours(data || []);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectTour = (tour) => {
    downloadTour(tour);
    navigation.navigate('TourDownload');
  };

  const handleResumeCachedTour = () => {
    if (cachedBundle && cachedBundle.tour) {
      resumeCachedTour(cachedBundle.tour.id);
      navigation.navigate('TourDownload');
    }
  };

  if (loading && !refreshing && !cachedBundle) {
    return (
      <View style={styles.centerContainer}>
        <LoadingIndicator label="Loading available tours..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={typography.title}>Explore Audio Tours</Text>
      <Text style={styles.subtitleText}>
        Select a tour to download POIs and audio scripts for screen-off playback.
      </Text>

      {/* Prominent Offline Resume Card (renders independently of network status) */}
      {cachedBundle && cachedBundle.tour && (
        <Pressable
          style={({ pressed }) => [
            styles.resumeCard,
            pressed && styles.resumeCardPressed,
          ]}
          onPress={handleResumeCachedTour}
        >
          <View style={styles.resumeHeader}>
            <Text style={styles.resumeBadge}>⚡ AVAILABLE OFFLINE</Text>
            <Text style={styles.resumeTitle}>Resume: {cachedBundle.tour.name}</Text>
          </View>

          <Text style={styles.resumeLocation}>
            📍 {cachedBundle.tour.city}
            {cachedBundle.tour.country ? `, ${cachedBundle.tour.country}` : ''}
          </Text>

          <Text style={styles.resumeStatus}>
            ✓ {cachedBundle.scripts.length} of {cachedBundle.pois.length} POIs ready for offline playback
          </Text>
        </Pressable>
      )}

      <ErrorBanner message={errorMsg} onRetry={loadData} />

      {tours.length === 0 && !errorMsg && !cachedBundle ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No tours available right now</Text>
          <Text style={styles.emptySubtext}>Please check back soon for new audio walks!</Text>
        </View>
      ) : (
        <FlatList
          data={tours}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TourListItem tour={item} onSelect={handleSelectTour} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitleText: {
    ...typography.subtitle,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  resumeCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  resumeCardPressed: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  resumeHeader: {
    marginBottom: spacing.xs,
  },
  resumeBadge: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  resumeTitle: {
    ...typography.title,
    fontSize: 18,
  },
  resumeLocation: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  resumeStatus: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justify.content: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.title,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.subtitle,
    textAlign: 'center',
  },
});
