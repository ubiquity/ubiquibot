import { getServer } from "./commands-test";

export function afterAllHandler(): () => Promise<void> {
  return async () => {
    await getServer().stop();
  };
}
