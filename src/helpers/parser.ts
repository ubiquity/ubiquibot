import axios from "axios";
import { HTMLElement, parse } from "node-html-parser";
import { getPullByNumber } from "./issue";
import { getBotContext, getLogger } from "../bindings";
import { Endpoints } from "@octokit/types";

interface GitParser {
  owner: string;
  repo: string;
  issue_number?: number;
  pull_number?: number;
  latest?: boolean;
}

export interface LinkedPR {
  prOrganization: string;
  prRepository: string;
  prNumber: number;
  prHref: string;
}

export type ListPullsByNumberResponse = Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"];

export const gitLinkedIssueParser = async ({ owner, repo, pull_number }: GitParser) => {
  const logger = getLogger();
  try {
    const { data } = await axios.get(`https://github.com/${owner}/${repo}/pull/${pull_number}`);
    const dom = parse(data);
    const devForm = dom.querySelector("[data-target='create-branch.developmentForm']") as HTMLElement;
    const linkedIssues = devForm.querySelectorAll(".my-1");

    if (linkedIssues.length === 0) {
      return null;
    }

    const issueUrl = linkedIssues[0].querySelector("a")?.attrs?.href || "";
    return issueUrl;
  } catch (error) {
    logger.error(`${JSON.stringify(error)}`);
    return null;
  }
};

export const gitLinkedPrParser = async ({ owner, repo, issue_number }: GitParser): Promise<PRsParserResponse[]> => {
  const logger = getLogger();
  try {
    const prData = [];
    const { data } = await axios.get(`https://github.com/${owner}/${repo}/issues/${issue_number}`);
    const dom = parse(data);
    const devForm = dom.querySelector("[data-target='create-branch.developmentForm']") as HTMLElement;
    const linkedPRs = devForm.querySelectorAll(".my-1");
    if (linkedPRs.length === 0) return [];

    for (const linkedPr of linkedPRs) {
      const prUrl = linkedPr.querySelector("a")?.attrs?.href;

      if (!prUrl) continue;

      const parts = prUrl.split("/");
      // extract the organization name and repo name from the link:(e.g. "
      const prOrganization = parts[parts.length - 4];
      const prRepository = parts[parts.length - 3];
      const prNumber = Number(parts[parts.length - 1]);
      const prHref = `https://github.com${prUrl}`;

      if (`${prOrganization}/${prRepository}` !== `${owner}/${repo}`) continue;

      prData.push({ prOrganization, prRepository, prNumber, prHref });
    }

    return prData;
  } catch (error) {
    logger.error(`${JSON.stringify(error)}`);
    return [];
  }
};

export const getLatestPullRequest = async (prs: PRsParserResponse[]): Promise<ListPullsByNumberResponse["data"] | null> => {
  const context = getBotContext();
  let linkedPullRequest = null;
  for (const _pr of prs) {
    if (Number.isNaN(_pr.prNumber)) return null;
    const pr = (await getPullByNumber(context, _pr.prNumber)) as ListPullsByNumberResponse["data"];
    if (!pr || !pr.merged) continue;

    if (!linkedPullRequest) linkedPullRequest = pr;
    else if (linkedPullRequest.merged_at && pr.merged_at && new Date(linkedPullRequest.merged_at) < new Date(pr.merged_at)) {
      linkedPullRequest = pr;
    }
  }

  return linkedPullRequest;
};
