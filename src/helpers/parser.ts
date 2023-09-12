import axios from "axios";
import { HTMLElement, parse } from "node-html-parser";
import { getPullByNumber } from "./issue";
import { getBotContext, getLogger } from "../bindings";
import { Payload } from "../types";

interface GitParser {
  owner: string;
  repo: string;
  issue_number?: number;
  pull_number?: number;
}

export const gitIssueParser = async ({ owner, repo, issue_number }: GitParser): Promise<boolean> => {
  try {
    const { data } = await axios.get(`https://github.com/${owner}/${repo}/issues/${issue_number}`);
    const dom = parse(data);
    const devForm = dom.querySelector("[data-target='create-branch.developmentForm']") as HTMLElement;
    const linkedPRs = devForm.querySelectorAll(".my-1");
    if (linkedPRs.length > 0) {
      //has LinkedPRs
      return true;
    } else {
      //no LinkedPRs
      return false;
    }
  } catch (error) {
    return true;
  }
};

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

export const gitLinkedPrParser = async ({ owner, repo, issue_number }: GitParser) => {
  const logger = getLogger();
  try {
    const { data } = await axios.get(`https://github.com/${owner}/${repo}/issues/${issue_number}`);
    const context = getBotContext();
    const payload = context.payload as Payload;
    const dom = parse(data);
    const devForm = dom.querySelector("[data-target='create-branch.developmentForm']") as HTMLElement;
    const linkedPRs = devForm.querySelectorAll(".my-1");
    if (linkedPRs.length === 0) return null;
    let linkedPullRequest = null;
    for (const linkedPr of linkedPRs) {
      const prHref = linkedPr.querySelector("a")?.attrs?.href || "";
      const parts = prHref.split("/");
      // extract the organization name and repo name from the link:(e.g. "https://github.com/wannacfuture/ubiquibot/pull/5";)
      const organization = parts[parts.length - 4];
      const repository = parts[parts.length - 3];

      if (`${organization}/${repository}` !== payload.repository.full_name) continue;
      const prNumber = parts[parts.length - 1];
      if (Number.isNaN(Number(prNumber))) return null;
      const pr = await getPullByNumber(context, Number(prNumber));
      if (!pr || !pr.merged) continue;

      if (!linkedPullRequest) linkedPullRequest = pr;
      else if (linkedPullRequest.merged_at && pr.merged_at && new Date(linkedPullRequest.merged_at) < new Date(pr.merged_at)) {
        linkedPullRequest = pr;
      }
    }
    return linkedPullRequest;
  } catch (error) {
    logger.error(`${JSON.stringify(error)}`);
    return null;
  }
};
