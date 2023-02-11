import { getLastWeeklyTime } from "../adapters/supabase";
let lastTime: number;

export const fetchGlobalStorage = async () => {
  lastTime = await getLastWeeklyTime();
};

export const getLastTime = (): number => lastTime;
export const setLastTime = (time: number) => (lastTime = time);
