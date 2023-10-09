import Runtime from "../bindings/bot-runtime";
import { User } from "../types";

export async function getUser(username: string) {
  // Gets the publicly available information about `username`
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const logger = runtime.logger;

  try {
    const res = await context.octokit.rest.users.getByUsername({
      username,
    });

    if (res.status === 200) {
      return res.data as User;
    } else {
      logger.debug({ message: `Unsatisfied response`, status: res.status, data: res.data });
    }
  } catch (err: unknown) {
    logger.info(`Getting user info failed! err: ${err}`);
  }

  return undefined;
}

export async function getOrgMembershipOfUser(org: string, username: string): Promise<string | undefined> {
  // Gets organization membership of a user
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const logger = runtime.logger;
  let membership: string | undefined = undefined;

  try {
    const res = await context.octokit.rest.orgs.getMembershipForUser({
      org,
      username,
    });

    if (res.status === 200) {
      membership = res.data.role;
    } else {
      logger.debug({ message: `Unsatisfied response`, status: res.status, data: res.data });
    }
  } catch (err: unknown) {
    logger.info(`Getting organization membership failed! err: ${err}`);
  }

  return membership;
}
