import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import TourListItem from '../components/tours/TourListItem';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorBanner from '../components/common/ErrorBanner';
import { fetchPublishedTours } from '../lib/toursApi';
import { useActiveTour } from '../context/ActiveTourContext';
import { colors, spacing, typography } from '../constants/theme';

export default function TourSelectionScreen({ navigation }) {
  const { downloadTour } = useActiveTour();

  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadTours = async () => {
    setLoading(true);
    setErrorMsg(null);

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
    const { data, error } = await fetchPublishedTours();
    if (error) {
      setErrorMsg(error.message || 'Failed to refresh tours.');
    } else {
      setTours(data || []);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    loadTours();
  }, []);

  const handleSelectTour = (tour) => {
    downloadTour(tour);
    navigation.navigate('TourDownload');
  };

  if (loading && !refreshing) {
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

      <ErrorBanner message={errorMsg} onRetry={loadTours} />

      {tours.length === 0 && !errorMsg ? (
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
