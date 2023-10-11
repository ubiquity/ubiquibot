import Runtime from "../bindings/bot-runtime";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Checks the rate limit for the GitHub API and waits if necessary
export async function checkRateLimitGit(headers: { "x-ratelimit-remaining"?: string; "x-ratelimit-reset"?: string }) {
  // Check the remaining limit
  const remainingRequests = headers["x-ratelimit-remaining"] ? parseInt(headers["x-ratelimit-remaining"]) : 0;

  // If there are no more remaining requests for this hour, we wait for the reset time
  if (remainingRequests === 0) {
    // const resetTime = new Date(parseInt(headers["x-ratelimit-reset"]! || "0") * 1000);
    const resetTime = new Date((headers["x-ratelimit-reset"] ? parseInt(headers["x-ratelimit-reset"]) : 0) * 1000);
    const now = new Date();
    const timeToWait = resetTime.getTime() - now.getTime();
    const logger = Runtime.getState().logger;
    logger.warn(`No remaining requests. Waiting for ${timeToWait}ms...`);
    await wait(timeToWait);
  }

  return remainingRequests;
}
