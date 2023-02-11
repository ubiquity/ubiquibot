import { init } from "../../adapters/summarize/summarize";
import { updateLastWeeklyTime } from "../../adapters/supabase";
import { getLastTime, setLastTime } from "../../global/globalStorage";
const SEVEN_DAYS = 604800;

export const checkWeeklyUpdate = async (): Promise<void> => {
  const DateNow = (await Date.now()) / 1000;
  const lastTime = await getLastTime();
  if (lastTime + SEVEN_DAYS < DateNow) {
    //process weekly update
    await init();
    await setLastTime(DateNow);
    await updateLastWeeklyTime(DateNow);
  }
};
