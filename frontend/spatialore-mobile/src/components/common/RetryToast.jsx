import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing } from '../../constants/theme';

export default function RetryToast({
  message,
  onRetry,
  onDismiss,
  autoDismissMs = 8000,
}) {
  useEffect(() => {
    if (!autoDismissMs) return;

    const timer = setTimeout(() => {
      if (typeof onDismiss === 'function') {
        onDismiss();
      }
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  if (!message) return null;

  return (
    <View style={styles.toastContainer}>
      <View style={styles.toastCard}>
        <View style={styles.messageRow}>
          <Text style={styles.iconText}>⚠️</Text>
          <Text style={styles.messageText}>{message}</Text>
        </View>

        <View style={styles.actionRow}>
          {typeof onRetry === 'function' && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRetry}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Retry 🔄</Text>
            </TouchableOpacity>
          )}

          {typeof onDismiss === 'function' && (
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissButtonText}>Dismiss ✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 85,
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
  },
  toastCard: {
    backgroundColor: '#1e293b',
    borderColor: colors.warning,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconText: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  messageText: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: 4,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  dismissButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  dismissButtonText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
