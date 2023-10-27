import Runtime from "../bindings/bot-runtime";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
export async function checkRateLimitGit(headers: { "x-ratelimit-remaining"?: string; "x-ratelimit-reset"?: string }) {
  const remainingRequests = headers["x-ratelimit-remaining"] ? parseInt(headers["x-ratelimit-remaining"]) : 0;
  if (remainingRequests === 0) {
    const resetTime = new Date((headers["x-ratelimit-reset"] ? parseInt(headers["x-ratelimit-reset"]) : 0) * 1000);
    const now = new Date();
    const timeToWait = resetTime.getTime() - now.getTime();
    const logger = Runtime.getState().logger;
    logger.warn("No remaining requests.", { resetTime, now, timeToWait });
    await wait(timeToWait);
  }
  return remainingRequests;
}
