// Tunable thresholds for the anti-gaming reports (spec §10).
// Conservative defaults — adjust per ops feedback.

export const OFFLINE_LAG_FLAG_HOURS = 24; // syncedAt - startedAtServer beyond this = suspicious
export const SHORT_DWELL_SECONDS = 60; // visits ended in under a minute
export const SAME_LOCATION_DECIMALS = 4; // ~11 m precision at the equator
export const SAME_LOCATION_MIN_CLUSTER = 3; // 3+ visits at same point = a cluster
export const CLOCK_DRIFT_FLAG_SECONDS = 10 * 60; // 10 minutes
