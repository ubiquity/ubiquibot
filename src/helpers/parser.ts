import axios from "axios";
import { HTMLElement, parse } from "node-html-parser";
import { getPullByNumber } from "./issue";
import { getBotContext, getLogger } from "../bindings";
import { Payload } from "../types";
import { Endpoints } from "@octokit/types";

interface GitParser {
  owner: string;
  repo: string;
  issue_number?: number;
  pull_number?: number;
  latest?: boolean;
}

export interface PRsForClose {
  number: number;
  href: string;
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

export const gitLinkedPrParser = async ({ owner, repo, issue_number }: GitParser): Promise<HTMLElement[]> => {
  const logger = getLogger();
  try {
    const { data } = await axios.get(`https://github.com/${owner}/${repo}/issues/${issue_number}`);
    const dom = parse(data);
    const devForm = dom.querySelector("[data-target='create-branch.developmentForm']") as HTMLElement;
    const linkedPRs = devForm.querySelectorAll(".my-1");
    if (linkedPRs.length === 0) return [];
    return linkedPRs;
  } catch (error) {
    logger.error(`${JSON.stringify(error)}`);
    return [];
  }
};

// Get the linked PRs from the issue, if latest is true, return the lastest merged PR
export const getLinkedPrs = async ({ owner, repo, issue_number, latest }: GitParser): Promise<PRsForClose[] | ListPullsByNumberResponse["data"] | null> => {
  const logger = getLogger();
  const context = getBotContext();
  const payload = context.payload as Payload;
  try {
    const linkedPRs = await gitLinkedPrParser({ owner, repo, issue_number });
    const prs: PRsForClose[] = [];
    let linkedPullRequest = null;

    for (const linkedPr of linkedPRs) {
      const prUrl = linkedPr.querySelector("a")?.attrs?.href;

      if (!prUrl) continue;

      const parts = prUrl.split("/");
      // extract the organization name and repo name from the link:(e.g. "
      const organization = parts[parts.length - 4];
      const repository = parts[parts.length - 3];

      if (`${organization}/${repository}` !== payload.repository.full_name) continue;

      const prNumber = Number(parts[parts.length - 1]);

      if (latest) {
        if (Number.isNaN(prNumber)) return null;
        const pr = (await getPullByNumber(context, prNumber)) as ListPullsByNumberResponse["data"];
        if (!pr || !pr.merged) continue;

        if (!linkedPullRequest) linkedPullRequest = pr;
        else if (linkedPullRequest.merged_at && pr.merged_at && new Date(linkedPullRequest.merged_at) < new Date(pr.merged_at)) {
          linkedPullRequest = pr;
        }
      } else {
        const prHref = `https://github.com${prUrl}`;
        prs.push({ number: prNumber, href: prHref });
      }
    }
    return latest ? linkedPullRequest : prs;
  } catch (error) {
    logger.error(`${JSON.stringify(error)}`);
    return latest
      ? null
      : [
          {
            number: 0,
            href: "",
          },
        ];
  }
};
