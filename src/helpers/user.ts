import { getBotContext, getLogger } from "../bindings";
import { Payload } from "../types";

/**
 * @dev Gets the publicly available information about `useranme`
 *
 * @param username The username you're getting information for
 */
export const getUser = async (username: string): Promise<any> => {
  const context = getBotContext();
  const logger = getLogger();

  try {
    const res = await context.octokit.rest.users.getByUsername({
      username,
    });

    if (res.status === 200) return res.data;
    else {
      logger.debug(`Unsatisfied response { status: ${res.status}, data: ${res.data}`);
    }
  } catch (err: unknown) {
    logger.info(`Getting user info failed! err: ${err}`);
  }

  return undefined;
};

/**
 * @dev Gets organization membership of a user
 * @param orgname The organization name
 * @param username The user name
 *
 * @returns The role name of a user in the organization. "admin" || "member" || "billing_manager"
 */
export const getOrgMembershipOfUser = async (org: string, username: string): Promise<string | undefined> => {
  const context = getBotContext();
  const logger = getLogger();
  let membership: string | undefined = undefined;

  try {
    const res = await context.octokit.rest.orgs.getMembershipForUser({
      org,
      username,
    });

    if (res.status === 200) {
      membership = res.data.role;
    } else {
      logger.debug(`Unsatisfied response { status: ${res.status}, data: ${res.data}`);
    }
  } catch (err: unknown) {
    logger.info(`Getting organization membership failed! err: ${err}`);
  }

  return undefined;
};
