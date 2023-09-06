import axios from "axios";
import { HTMLElement, parse } from "node-html-parser";

interface GitParser {
  owner: string;
  repo: string;
  issue_number: number;
}

export const gitIssueParser = async ({ owner, repo, issue_number }: GitParser): Promise<{ number: number; href: string }[]> => {
  try {
    const { data } = await axios.get(`https://github.com/${owner}/${repo}/issues/${issue_number}`);
    const dom = parse(data);
    const devForm = dom.querySelector("[data-target='create-branch.developmentForm']") as HTMLElement;
    const linkedPRs = devForm.querySelectorAll(".my-1");

    const prs: { number: number; href: string }[] = [];
    linkedPRs.forEach((pr) => {
      const prUrl = pr.querySelector("a")?.attrs?.href;

      if (!prUrl) return;

      const prInfo = prUrl.split("/");
      const prNumber = Number(prInfo[prInfo.length - 1]);
      const prHref = `https://github.com${prUrl}`;

      prs.push({ number: prNumber, href: prHref });
    });
    return prs;
  } catch (error) {
    return [
      {
        number: 0,
        href: "",
      },
    ];
  }
};

export const gitLinkedIssueParser = async ({ owner, repo, issue_number }: GitParser): Promise<string> => {
  try {
    const { data } = await axios.get(`https://github.com/${owner}/${repo}/pull/${issue_number}`);
    const dom = parse(data);
    const devForm = dom.querySelector("[data-target='create-branch.developmentForm']") as HTMLElement;
    const linkedPRs = devForm.querySelectorAll(".my-1");

    if (linkedPRs.length === 0) {
      return "";
    }

    const prUrl = linkedPRs[0].querySelector("a")?.attrs?.href || "";
    return prUrl;
  } catch (error) {
    return "";
  }
};
