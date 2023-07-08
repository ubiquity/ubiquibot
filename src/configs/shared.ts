export const COLORS = {
  default: "ededed",
  price: "1f883d",
};
export const DEFAULT_BOT_DELAY = 100; // 100ms
export const DEFAULT_TIME_RANGE_FOR_MAX_ISSUE = 24;
export const DEFAULT_TIME_RANGE_FOR_MAX_ISSUE_ENABLED = true;
/**
 * ms('2 days')  // 172800000
 * ms('1d')      // 86400000
 * ms('10h')     // 36000000
 * ms('2.5 hrs') // 9000000
 * ms('2h')      // 7200000
 * ms('1m')      // 60000
 * ms('5s')      // 5000
 * ms('1y')      // 31557600000
 * ms('100')     // 100
 * ms('-3 days') // -259200000
 * ms('-1h')     // -3600000
 * ms('-200')    // -200
 */
export const DEFAULT_FOLLOWUP_TIME = "4 days"; // 4 days
export const DEFAULT_DISQUALIFY_TIME = "7 days"; // 7 days

export const DEFAULT_CHAIN_ID = 1; // ethereum
export const DEFAULT_RPC_ENDPOINT = "https://rpc-bot.ubq.fi/v1/mainnet";
export const DEFAULT_PERMIT_BASE_URL = "https://pay.ubq.fi";
