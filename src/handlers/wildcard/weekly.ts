import { run } from "./weekly/action";
import { getLastWeeklyTime, updateLastWeeklyTime } from "../../adapters/supabase";
import { BotContext } from "../../types";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const checkWeeklyUpdate = async (context: BotContext) => {
  const { log } = context;
  const {
    mode: { disableAnalytics },
  } = context.botConfig;
  if (disableAnalytics) {
    log.info(`Skipping to collect the weekly analytics, reason: mode=${disableAnalytics}`);
    return;
  }
  const curTime = new Date();
  const lastTime = await getLastWeeklyTime();
  if (lastTime == undefined || new Date(lastTime.getTime() + SEVEN_DAYS) < curTime) {
    await run(context);
    await updateLastWeeklyTime(context, curTime);
  } else {
    log.info(`Skipping to collect the weekly analytics because 7 days have not passed`);
  }
};
