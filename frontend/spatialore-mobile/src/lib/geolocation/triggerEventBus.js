/**
 * Minimal pub/sub event bus bridging background TaskManager location updates
 * to foreground UI components (ActiveTourScreen) without extra dependencies.
 */

const triggerListeners = new Set();
const prefetchListeners = new Set();

/**
 * Subscribes a callback to trigger events.
 * Returns an unsubscribe function for cleanup in React useEffect.
 */
export function subscribeTriggerEvents(callback) {
  triggerListeners.add(callback);
  return () => {
    triggerListeners.delete(callback);
  };
}

/**
 * Emits a newly triggered POI event to all active trigger listeners.
 */
export function emitTriggerEvent(poi) {
  triggerListeners.forEach((cb) => {
    try {
      cb(poi);
    } catch (err) {
      console.error('Error in trigger event listener:', err);
    }
  });
}

/**
 * Subscribes a callback to prefetch events.
 * Returns an unsubscribe function for cleanup in React useEffect.
 */
export function subscribePrefetchEvents(callback) {
  prefetchListeners.add(callback);
  return () => {
    prefetchListeners.delete(callback);
  };
}

/**
 * Emits a newly prefetched POI event to all active prefetch listeners.
 */
export function emitPrefetchEvent(poi) {
  prefetchListeners.forEach((cb) => {
    try {
      cb(poi);
    } catch (err) {
      console.error('Error in prefetch event listener:', err);
    }
  });
}

