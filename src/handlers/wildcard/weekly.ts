import { run } from "./weekly/action";
import { getLastWeeklyTime, updateLastWeeklyTime } from "../../adapters/supabase";
import { getBotConfig, getBotContext } from "../../bindings";

const SEVEN_DAYS = 604800; // 7 days in seconds

export const checkWeeklyUpdate = async () => {
  const { log } = getBotContext();
  const {
    mode: { analytics },
  } = getBotConfig();
  if (!analytics) {
    log.info(`Skipping to collect the weekly analytics, reason: mode=${analytics}`);
    return;
  }
  const curTime = Date.now() / 1000;
  const lastTime = await getLastWeeklyTime();
  if (lastTime + SEVEN_DAYS < curTime) {
    await run();
    await updateLastWeeklyTime(curTime);
  }
};
