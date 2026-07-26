/**
 * Network Connectivity Monitor for SpatiaLore Mobile.
 * Wraps @react-native-community/netinfo to detect online/offline transitions.
 */

import NetInfo from '@react-native-community/netinfo';

let wasConnected = null;

/**
 * Subscribes to network connectivity state changes.
 * Fires callback(true) specifically on transition into a connected state.
 *
 * @param {Function} callback - Callback function receiving isConnected (boolean)
 * @returns {Function} Unsubscribe function
 */
export function subscribeToConnectivityChanges(callback) {
  const unsubscribe = NetInfo.addEventListener((state) => {
    const isConnected = Boolean(state.isConnected && state.isInternetReachable !== false);

    // Only fire callback when transitioning into a connected state
    if (isConnected && wasConnected !== true) {
      console.log('🌐 [Network Monitor] Device transitioned to ONLINE state');
      if (typeof callback === 'function') {
        callback(true);
      }
    }

    wasConnected = isConnected;
  });

  return unsubscribe;
}

/**
 * Performs a one-off network connectivity check.
 *
 * @returns {Promise<boolean>} True if connected to internet
 */
export async function getCurrentConnectivity() {
  try {
    const state = await NetInfo.fetch();
    const isConnected = Boolean(state.isConnected && state.isInternetReachable !== false);
    wasConnected = isConnected;
    return isConnected;
  } catch (err) {
    console.warn('Error fetching network connectivity:', err);
    return false;
  }
}
