/**
 * Development-Only Performance & Battery Diagnostic Logger for SpatiaLore.
 *
 * Privacy Note:
 * This logger is strictly development-only (__DEV__ gated) and does not store
 * or send telemetry to backend analytics tables, preserving strict privacy boundaries.
 */

/**
 * Logs a structured performance summary at tour conclusion in dev builds.
 *
 * @param {Object} metrics
 * @param {string} metrics.tourId - Tour ID
 * @param {string} [metrics.tourName] - Tour Name
 * @param {number} metrics.durationMinutes - Total elapsed tour minutes
 * @param {number|null} metrics.batteryDrainPercent - Battery percentage drained
 * @param {number} metrics.triggeredPoiCount - Total triggered POIs during tour
 */
export function logTourPerformanceSummary({
  tourId,
  tourName = 'Tour',
  durationMinutes = 0,
  batteryDrainPercent = null,
  triggeredPoiCount = 0,
}) {
  if (__DEV__) {
    const roundedMinutes = Math.max(0.1, Number(durationMinutes.toFixed(1)));
    const hours = roundedMinutes / 60;

    let drainRateStr = 'N/A';
    if (typeof batteryDrainPercent === 'number') {
      const ratePerHour = (batteryDrainPercent / hours).toFixed(1);
      drainRateStr = `${ratePerHour}%/hr`;
    }

    const drainStr =
      typeof batteryDrainPercent === 'number'
        ? `${batteryDrainPercent.toFixed(1)}%`
        : 'Unavailable (Simulator/Hardware limitation)';

    console.log('\n=================== 📊 [PERF DIAGNOSTICS] ===================');
    console.log(`Tour Name:           "${tourName}" (ID: ${tourId})`);
    console.log(`Elapsed Duration:    ${roundedMinutes} mins (${hours.toFixed(2)} hrs)`);
    console.log(`Battery Drained:     ${drainStr}`);
    console.log(`Normalized Drain:    ${drainRateStr} (PRD NFR Target: <8%/hr)`);
    console.log(`Triggered POIs:      ${triggeredPoiCount}`);
    console.log('=============================================================\n');
  }
}
