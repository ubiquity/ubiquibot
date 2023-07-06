import ms from "ms";
import { getLogger } from "../bindings";

const MILLISECONDS = 1000;

export const convertTimeToSeconds = (time: string): number => {
  let _time = time;

  // `ms` doesn't support month conversion, so converting to days from months.
  if (_time.toLowerCase().includes("month")) {
    _time = "30 Days";
  }

  const logger = getLogger();
  try {
    return ms(_time) / MILLISECONDS;
  } catch (e) {
    logger.error(`Failed to parse timeline from label: ${time} `);
    return 0;
  }
};
