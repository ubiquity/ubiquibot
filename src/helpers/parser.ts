import axios from "axios";
import { HTMLElement, parse } from "node-html-parser";
import { getPullByNumber } from "./issue";
import Runtime from "../bindings/bot-runtime";

interface GetLinkedParams {
  owner: string;
  repository: string;
  issue?: number;
  pull?: number;
}

export interface GetLinkedResults {
  organization: string;
  repository: string;
  number: number;
  href: string;
}

export async function getLinkedIssues({ owner, repository, pull }: GetLinkedParams) {
  const { data } = await axios.get(`https://github.com/${owner}/${repository}/pull/${pull}`);
  const dom = parse(data);
  const devForm = dom.querySelector("[data-target='create-branch.developmentForm']") as HTMLElement;
  const linkedIssues = devForm.querySelectorAll(".my-1");

  if (linkedIssues.length === 0) {
    return null;
  }

  const issueUrl = linkedIssues[0].querySelector("a")?.attrs?.href || "";
  return issueUrl;
}

export async function getLinkedPullRequests({
  owner,
  repository,
  issue,
}: GetLinkedParams): Promise<GetLinkedResults[]> {
  const logger = Runtime.getState().logger;
  const collection = [];
  const { data } = await axios.get(`https://github.com/${owner}/${repository}/issues/${issue}`);
  const dom = parse(data);
  const devForm = dom.querySelector("[data-target='create-branch.developmentForm']") as HTMLElement;
  const linkedList = devForm.querySelectorAll(".my-1");
  if (linkedList.length === 0) {
    logger.info(`No linked pull requests found`);
    return [];
  }

  for (const linked of linkedList) {
    const relativeHref = linked.querySelector("a")?.attrs?.href;
    if (!relativeHref) continue;
    const parts = relativeHref.split("/");

    // check if array size is at least 4
    if (parts.length < 4) continue;

    // extract the organization name and repo name from the link:(e.g. "
    const organization = parts[parts.length - 4];
    const repository = parts[parts.length - 3];
    const number = Number(parts[parts.length - 1]);
    const href = `https://github.com${relativeHref}`;

    if (`${organization}/${repository}` !== `${owner}/${repository}`) {
      logger.info(`Skipping linked pull request from another organization: ${href}`);
      continue;
    }

    collection.push({ organization, repository, number, href });
  }

  return collection;
}

export async function getLatestMergedPullRequest(pulls: GetLinkedResults[]) {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  let latestMergedPullRequest = null;

  for (const pullRequest of pulls) {
    if (Number.isNaN(pullRequest.number)) return null;

    const currentPullRequest = await getPullByNumber(context, pullRequest.number);
    if (!currentPullRequest || !currentPullRequest.merged) continue;

    if (
      !latestMergedPullRequest ||
      isNewerPullRequest(currentPullRequest.merged_at, latestMergedPullRequest.merged_at)
    ) {
      latestMergedPullRequest = currentPullRequest;
    }
  }

  return latestMergedPullRequest;
}

function isNewerPullRequest(currentMergedAt: string | null, latestMergedAt: string | null) {
  return latestMergedAt && currentMergedAt && new Date(latestMergedAt).getTime() < new Date(currentMergedAt).getTime();
}
