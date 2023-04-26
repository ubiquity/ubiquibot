import { getBotContext, getLogger } from "../../bindings";
import { Payload } from "../../types";

// Use `context.octokit.rest` to get the pull requests for the repository
export const getPullRequests = async () => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  try {
    const { data: pulls } = await context.octokit.rest.pulls.list({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      state: "open",
    });
    return pulls;
  } catch (e: unknown) {
    logger.debug(`Fetching pull requests failed!, reason: ${e}`);
    return {};
  }
};

// Check for pull requests linked to their respective issues but not assigned to them
export const checkPullRequests = async () => {
  const pulls = await getPullRequests();

  console.log(pulls);
};
