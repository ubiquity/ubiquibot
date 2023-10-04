import { getServer } from "./commands-test";

export function afterAllHandler(): jest.ProvidesHookCallback {
  return async () => {
    await getServer().stop();
  };
}
