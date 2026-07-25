import { Pedometer, Magnetometer } from 'expo-sensors';

let pedometerSubscription = null;
let magnetometerSubscription = null;
let accumulatedStepsSinceGpsFix = 0;
let latestCompassHeading = 0;
let sensorsActive = false;

/**
 * Starts Pedometer step counting and Magnetometer compass heading tracking.
 */
export async function startPdrSensors() {
  if (sensorsActive) return;
  sensorsActive = true;
  accumulatedStepsSinceGpsFix = 0;

  try {
    // 1. Subscribe to Pedometer step updates if available
    const isPedometerAvailable = await Pedometer.isAvailableAsync();
    if (isPedometerAvailable) {
      pedometerSubscription = Pedometer.watchStepCount((result) => {
        if (result && typeof result.steps === 'number') {
          accumulatedStepsSinceGpsFix += result.steps;
        }
      });
      console.log('✅ Pedometer step tracking initialized');
    } else {
      console.warn('Pedometer sensor is unavailable on this device.');
    }

    // 2. Subscribe to Magnetometer heading updates
    Magnetometer.setUpdateInterval(500); // 2Hz update frequency for compass
    magnetometerSubscription = Magnetometer.addListener((data) => {
      if (data) {
        const { x, y } = data;
        // Compute heading in degrees (0 - 360°)
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        if (angle < 0) {
          angle += 360;
        }
        latestCompassHeading = angle;
      }
    });
    console.log('✅ Magnetometer compass tracking initialized');
  } catch (err) {
    console.error('Error starting PDR sensors:', err);
  }
}

/**
 * Resets accumulated step counter when a fresh GPS fix re-anchors position.
 */
export function resetPdrStepCount() {
  accumulatedStepsSinceGpsFix = 0;
}

/**
 * Returns current PDR sensor snapshot (accumulated steps and compass heading).
 */
export function getPdrSensorSnapshot() {
  return {
    stepCount: accumulatedStepsSinceGpsFix,
    headingDegrees: latestCompassHeading,
  };
}

/**
 * Stops PDR sensor subscriptions and cleans up event listeners.
 */
export function stopPdrSensors() {
  sensorsActive = false;
  accumulatedStepsSinceGpsFix = 0;

  if (pedometerSubscription) {
    pedometerSubscription.remove();
    pedometerSubscription = null;
  }

  if (magnetometerSubscription) {
    magnetometerSubscription.remove();
    magnetometerSubscription = null;
  }

  console.log('🛑 PDR sensors stopped');
}
