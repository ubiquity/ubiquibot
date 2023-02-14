import { init } from "../../adapters/summarize/summarize";
import { getLastWeeklyTime, updateLastWeeklyTime } from "../../adapters/supabase";
const SEVEN_DAYS = 604800;

export const checkWeeklyUpdate = async (): Promise<void> => {
  const DateNow = (await Date.now()) / 1000;
  const lastTime = await getLastWeeklyTime();
  if (lastTime + SEVEN_DAYS < DateNow) {
    //process weekly update
    await init();
    await updateLastWeeklyTime(DateNow);
  }
};
