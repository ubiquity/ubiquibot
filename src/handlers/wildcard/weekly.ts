import { run } from "./weekly/action";
import { getLastWeeklyTime, updateLastWeeklyTime } from "../../adapters/supabase";

const SEVEN_DAYS = 604800; // 7 days in seconds

export const checkWeeklyUpdate = async () => {
  const curTime = Date.now() / 1000;
  const lastTime = await getLastWeeklyTime();
  if (lastTime + SEVEN_DAYS < curTime) {
    await run();
    await updateLastWeeklyTime(curTime);
  }
};
