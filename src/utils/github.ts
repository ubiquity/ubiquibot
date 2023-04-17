import { wait } from "../helpers";

// explain how this works
/**
 * Checks the rate limit for the GitHub API and waits if necessary
 * @param headers The headers of the response
 * @returns The remaining requests
 * @example
 * const remainingRequests = await checkRateLimitGit(headers);
 * console.log(`Remaining requests: ${remainingRequests}`);
 **/

export const checkRateLimitGit = async (headers: any) => {
  // Check the remaining limit
  const remainingRequests = parseInt(headers["x-ratelimit-remaining"]! || "0");

  // If there are no more remaining requests for this hour, we wait for the reset time
  if (remainingRequests === 0) {
    const resetTime = new Date(parseInt(headers["x-ratelimit-reset"]! || "0") * 1000);
    const now = new Date();
    const timeToWait = resetTime.getTime() - now.getTime();
    console.log(`No remaining requests. Waiting for ${timeToWait}ms...`);
    await wait(timeToWait);
  }

  return remainingRequests;
};
