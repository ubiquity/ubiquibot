import { getBotContext } from "../bindings";

/**
 * @dev Gets the publicly available information about `useranme`
 *
 * @param username The username you're getting information for
 */
export const getUser = async (username: string): Promise<any> => {
  const context = getBotContext();

  try {
    const res = await context.octokit.rest.users.getByUsername({
      username,
    });

    if (res.status === 200) return res.data;
    else {
      context.log.debug(`Unsatisfied response`, { status: res.status, data: res.data });
    }
  } catch (err: unknown) {
    context.log.info(`Getting user info failed!`, { err });
  }

  return undefined;
};
