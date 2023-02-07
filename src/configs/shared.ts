export const BountyAccount = "ubiquity-bounties";
export const COLORS = {
  price: "008000",
};
export const DEFAULT_BOT_DELAY = 100; // 100ms

/**
 * Timestamps for unassigning features. Not sure this is the best standard for our feature.
 * but it would be fine at least in terms of standarization.
 *
 * ISO 8601(https://en.wikipedia.org/wiki/ISO_8601) is a set of standardized date and time formats
 * in an attempt to tame every programmer's favorite challenge.
 * Durations represent the amount of time between two dates or times.
 *
 * [Format]
 * Y = years
 * M = months
 * W = weeks
 * D = days
 * T = delineator between dates and times, necessary to disambiguate between months and minutes
 * H = hours
 * M = minutes
 * S = seconds
 *
 * [Example]
 * P3Y6M4DT12H30M5S (3 years, 6 months, 4 days, 12 hours, 30 minutes, and 5 seconds)
 * P3DT12H (3 days and 12 hours)
 * P1M (1 month)
 * PT1M (1 minute)
 * PT0S (0)
 * P0.5Y (1/2 a year)
 * PT1M3.025S (1 minute and 3025 milliseconds)
 */
export const DEFAULT_FOLLOWUP_TIME = "P4D"; // 4 days
export const DEFAULT_DISQUALIFY_TIME = "P7D"; // 7 days
