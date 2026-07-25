/**
 * Minimal pub/sub event bus bridging background TaskManager location updates
 * to foreground UI components (ActiveTourScreen) without extra dependencies.
 */

const listeners = new Set();

/**
 * Subscribes a callback to trigger events.
 * Returns an unsubscribe function for cleanup in React useEffect.
 */
export function subscribeTriggerEvents(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Emits a newly triggered POI event to all active listeners.
 */
export function emitTriggerEvent(poi) {
  listeners.forEach((cb) => {
    try {
      cb(poi);
    } catch (err) {
      console.error('Error in trigger event listener:', err);
    }
  });
}
