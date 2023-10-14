import { Comment, Payload, UserCommands } from "../../../types";
import { IssueCommentCommands } from "../commands";
import { assign } from "./assign";
import { listAvailableCommands } from "./help";
// Commented out until Gnosis Safe is integrated (https://github.com/ubiquity/ubiquibot/issues/353)
// import { payout } from "./payout";
import { unassign } from "./unassign";
import { registerWallet } from "./wallet";
import { approveLabelChange } from "./authorize";
import { setAccess } from "./allow";
import { ask } from "./ask";
import { multiplier } from "./multiplier";
import { BigNumber, ethers } from "ethers";
import { addPenalty } from "../../../adapters/supabase";
import {
  addCommentToIssue,
  createLabel,
  addLabelToIssue,
  getLabel,
  upsertCommentToIssue,
  getAllIssueComments,
  getPayoutConfigByNetworkId,
  getTokenSymbol,
  getAllIssueAssignEvents,
  calculateWeight,
  getAllPullRequests,
} from "../../../helpers";
import { getBotConfig, getBotContext, getLogger } from "../../../bindings";
import {
  handleIssueClosed,
  incentivesCalculation,
  calculateIssueConversationReward,
  calculateIssueCreatorReward,
  calculateIssueAssigneeReward,
  calculatePullRequestReviewsReward,
} from "../../payout";
import { query } from "./query";
import { autoPay } from "./payout";
import { getTargetPriceLabel } from "../../shared";
import Decimal from "decimal.js";
import { ErrorDiff } from "../../../utils/helpers";
import { lastActivityTime } from "../../wildcard";

export * from "./assign";
export * from "./wallet";
export * from "./unassign";
export * from "./payout";
export * from "./help";
export * from "./multiplier";
export * from "./query";
export * from "./ask";
export * from "./authorize";

export interface RewardsResponse {
  error: string | null;
  title?: string;
  userId?: number;
  username?: string;
  reward?: {
    account: string;
    priceInEth: Decimal;
    penaltyAmount: BigNumber;
    user: string;
    userId: number;
    debug: Record<string, { count: number; reward: Decimal }>;
  }[];
  fallbackReward?: Record<string, Decimal>;
}

/**
 * Parses the comment body and figure out the command name a user wants
 *
 *
 * @param body - The comment body
 * @returns The list of command names the comment includes
 */

export const commentParser = (body: string): IssueCommentCommands[] => {
  const regex = /^\/(\w+)\b/; // Regex pattern to match the command at the beginning of the body

  const matches = regex.exec(body);
  if (matches) {
    const command = matches[0] as IssueCommentCommands;
    if (Object.values(IssueCommentCommands).includes(command)) {
      return [command];
    }
  }

  return [];
};

/**
 * Callback for issues closed - Processor
 */

export const issueClosedCallback = async (): Promise<void> => {
  const { payload: _payload } = getBotContext();
  const issue = (_payload as Payload).issue;
  if (!issue) return;
  try {
    // assign function incentivesCalculation to a variable
    const calculateIncentives = await incentivesCalculation();

    const creatorReward = await calculateIssueCreatorReward(calculateIncentives);
    const assigneeReward = await calculateIssueAssigneeReward(calculateIncentives);
    const conversationRewards = await calculateIssueConversationReward(calculateIncentives);
    const pullRequestReviewersReward = await calculatePullRequestReviewsReward(calculateIncentives);

    const { error } = await handleIssueClosed(creatorReward, assigneeReward, conversationRewards, pullRequestReviewersReward, calculateIncentives);

    if (error) {
      throw new Error(error);
    }
  } catch (err: unknown) {
    return await addCommentToIssue(ErrorDiff(err), issue.number);
  }
};

/**
 * Callback for issues created - Processor
 */

export const issueCreatedCallback = async (): Promise<void> => {
  const logger = getLogger();
  const { payload: _payload } = getBotContext();
  const config = getBotConfig();
  const issue = (_payload as Payload).issue;
  if (!issue) return;
  const labels = issue.labels;

  const { assistivePricing } = config.mode;

  if (!assistivePricing) {
    logger.info("Skipping adding label to issue because assistive pricing is disabled.");
    return;
  }

  try {
    const timeLabels = config.price.timeLabels.filter((item) => labels.map((i) => i.name).includes(item.name));
    const priorityLabels = config.price.priorityLabels.filter((item) => labels.map((i) => i.name).includes(item.name));

    const minTimeLabel =
      timeLabels.length > 0 ? timeLabels.reduce((a, b) => (calculateWeight(a) < calculateWeight(b) ? a : b)).name : config.price.defaultLabels[0];
    const minPriorityLabel =
      priorityLabels.length > 0 ? priorityLabels.reduce((a, b) => (calculateWeight(a) < calculateWeight(b) ? a : b)).name : config.price.defaultLabels[1];
    if (!timeLabels.length) await addLabelToIssue(minTimeLabel);
    if (!priorityLabels.length) await addLabelToIssue(minPriorityLabel);

    const targetPriceLabel = getTargetPriceLabel(minTimeLabel, minPriorityLabel);
    if (targetPriceLabel && !labels.map((i) => i.name).includes(targetPriceLabel)) {
      const exist = await getLabel(targetPriceLabel);
      if (!exist) await createLabel(targetPriceLabel, "price");
      await addLabelToIssue(targetPriceLabel);
    }
  } catch (err: unknown) {
    await addCommentToIssue(ErrorDiff(err), issue.number);
  }
};

/**
 * Callback for issues reopened - Blame Processor
 * @notice Identifies the changes in main that broke the features of the issue
 * @notice This is to assign responsibility to the person who broke the feature
 * @dev The person in fault will be penalized...
 */
export const issueReopenedBlameCallback = async (): Promise<void> => {
  const logger = getLogger();
  const context = getBotContext();
  // const config = getBotConfig();
  const payload = context.payload as Payload;
  const issue = payload.issue;
  const repository = payload.repository;

  if (!issue) return;
  if (!repository) return;

  const allRepoCommits = await context.octokit.repos
    .listCommits({
      owner: repository.owner.login,
      repo: repository.name,
    })
    .then((res) => res.data);

  const currentCommit = allRepoCommits[0];
  const currentCommitSha = currentCommit.sha;
  const lastActivity = await lastActivityTime(issue, await getAllIssueComments(issue.number));

  const allClosedPulls = await getAllPullRequests(context, "closed");
  const mergedPulls = allClosedPulls.filter((pull) => pull.merged_at && pull.merged_at > lastActivity.toISOString());
  const mergedSHAs = mergedPulls.map((pull) => pull.merge_commit_sha);
  const commitsThatMatch = allRepoCommits.filter((commit) => mergedSHAs.includes(commit.sha)).reverse();

  const pullsThatCommitsMatch = await Promise.all(
    commitsThatMatch.map((commit) =>
      context.octokit.repos
        .listPullRequestsAssociatedWithCommit({
          owner: repository.owner.login,
          repo: repository.name,
          commit_sha: commit.sha,
        })
        .then((res) => res.data)
    )
  );

  const onlyPRsNeeded = pullsThatCommitsMatch.map((pulls) => pulls.map((pull) => pull.number)).reduce((acc, val) => acc.concat(val), []);

  const issueRegex = new RegExp(`#${issue.number}`, "g");
  const matchingPull = mergedPulls.find((pull) => pull.body?.match(issueRegex));

  if (!matchingPull) {
    logger.info(`No matching pull found for issue #${issue.number}`);
    return;
  }

  const pullDiff = await context.octokit.repos
    .compareCommitsWithBasehead({
      owner: repository.owner.login,
      repo: repository.name,
      basehead: matchingPull?.merge_commit_sha + "..." + currentCommitSha,
      mediaType: {
        format: "diff",
      },
    })
    .then((res) => res.data);

  const diffs = [];
  const fileLens: number[] = [];

  for (const sha of mergedSHAs) {
    if (!sha) continue;
    const diff = await context.octokit.repos
      .compareCommitsWithBasehead({
        owner: repository.owner.login,
        repo: repository.name,
        basehead: sha + "..." + currentCommitSha,
      })
      .then((res) => res.data);

    const fileLen = diff.files?.length;

    fileLens.push(fileLen || 0);
    diffs.push(diff);

    if (diff.files && diff.files.length > 0) {
      logger.info(`Found ${diff.files.length} files changed in commit ${sha}`);
    } else {
      logger.info(`No files changed in commit ${sha}`);
    }
  }

  if (pullDiff.files && pullDiff.files.length > 0) {
    logger.info(`Found ${pullDiff.files.length} files changed in commit ${matchingPull?.merge_commit_sha}`);
  }

  const matchingSlice = matchingPull?.merge_commit_sha?.slice(0, 8);
  const currentSlice = currentCommitSha.slice(0, 8);

  const twoDotUrl = `<code>[${matchingSlice}..${currentSlice}](${repository.html_url}/compare/${matchingPull?.merge_commit_sha}..${currentCommitSha})</code>`;

  interface Blamer {
    author: string;
    count: number;
  }

  const blamers: Blamer[] = [];

  for (const diff of diffs) {
    if (!diff.files) continue;
    for (const file of diff.files) {
      const linesChanged = file.patch?.split("\n").filter((line) => line.startsWith("+")).length;
      const author = diff.base_commit?.author?.login;
      const blamer = blamers.find((b) => b.author === author);
      if (blamer) {
        blamer.count += linesChanged || 0;
      } else {
        blamers.push({ author: author || "", count: linesChanged || 0 });
      }
    }
  }

  const advancedBlameTable = `
  | **Blame** | **Count** | **%** |
  | --- | --- | --- |
  ${Array.from(new Set(blamers))
    .filter((blamer) => blamer.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((blamer) => {
      const linesChanged = blamer.count;
      const totalLinesChanged = blamers.reduce((acc, val) => acc + val.count, 0);
      const percent = Math.round((linesChanged / totalLinesChanged) * 100);
      return `| ${blamer.author} | ${blamer.count} | ${percent}% |`;
    })
    .join("\n")}
  `;

  const blameQuantifier = blamers.length > 1 ? "suspects" : "suspect";

  const comment = `
<details>
<summary>Merged Pulls Since Issue Close</summary><br/>

${onlyPRsNeeded
  .sort()
  .map((pullNumber) => `\n<ul><li>#${pullNumber}</li></ul>`)
  .join("\n")}
</details>


<details>
<summary>Merged Commits Since Issue Close</summary><br/>
${diffs
  // @ts-expect-error - diff is unused
  .map((diff, i) => {
    const fileLen = fileLens[i];
    const sha = mergedSHAs[i];
    const slice = sha?.slice(0, 7);
    const url = `${repository.html_url}/commit/${sha}`;
    return `\n<code><a href="${url}">${slice}</a></code> - ${fileLen} files changed`;
  })
  .join("\n")}
</details>

<details>
<summary>Assigned Blame</summary><br/>

The following ${blameQuantifier} may be responsible for breaking this issue:
  ${advancedBlameTable}
</details>

<hr>

2 dot: ${twoDotUrl}
3 dot: ${repository.html_url}/compare/${matchingPull?.merge_commit_sha}...${currentCommitSha}
`;

  await addCommentToIssue(comment, issue.number);
};

/**
 * Callback for issues reopened - Processor
 */

export const issueReopenedCallback = async (): Promise<void> => {
  const { payload: _payload } = getBotContext();
  const {
    payout: { permitBaseUrl },
  } = getBotConfig();
  const logger = getLogger();
  const issue = (_payload as Payload).issue;
  const repository = (_payload as Payload).repository;
  if (!issue) return;
  try {
    // find permit comment from the bot
    const comments = await getAllIssueComments(issue.number);
    const claimUrlRegex = new RegExp(`\\((${permitBaseUrl}\\?claim=\\S+)\\)`);
    const permitCommentIdx = comments.findIndex((e) => e.user.type === "Bot" && e.body.match(claimUrlRegex));
    if (permitCommentIdx === -1) {
      return;
    }

    // extract permit amount and token
    const permitComment = comments[permitCommentIdx];
    const permitUrl = permitComment.body.match(claimUrlRegex);
    if (!permitUrl || permitUrl.length < 2) {
      logger.error(`Permit URL not found`);
      return;
    }
    const url = new URL(permitUrl[1]);
    const claimBase64 = url.searchParams.get("claim");
    if (!claimBase64) {
      logger.error(`Permit claim search parameter not found`);
      return;
    }
    let networkId = url.searchParams.get("network");
    if (!networkId) {
      networkId = "1";
    }
    const { rpc } = getPayoutConfigByNetworkId(Number(networkId));
    let claim;
    try {
      claim = JSON.parse(Buffer.from(claimBase64, "base64").toString("utf-8"));
    } catch (err: unknown) {
      logger.error(`Error parsing claim: ${err}`);
      return;
    }
    const amount = BigNumber.from(claim.permit.permitted.amount);
    const formattedAmount = ethers.utils.formatUnits(amount, 18);
    const tokenAddress = claim.permit.permitted.token;
    const tokenSymbol = await getTokenSymbol(tokenAddress, rpc);

    // find latest assignment before the permit comment
    const events = await getAllIssueAssignEvents(issue.number);
    if (events.length === 0) {
      logger.error(`No assignment found`);
      return;
    }
    const assignee = events[0].assignee.login;

    if (parseFloat(formattedAmount) > 0) {
      // write penalty to db
      try {
        await addPenalty(assignee, repository.full_name, tokenAddress, networkId.toString(), amount);
      } catch (err) {
        logger.error(`Error writing penalty to db: ${err}`);
        return;
      }

      await addCommentToIssue(
        `@${assignee} please be sure to review this conversation and implement any necessary fixes. Unless this is closed as completed, its payment of **${formattedAmount} ${tokenSymbol}** will be deducted from your next bounty.`,
        issue.number
      );
    } else {
      logger.info(`Skipped penalty because amount is 0`);
    }
  } catch (err: unknown) {
    await addCommentToIssue(ErrorDiff(err), issue.number);
  }
};

/**
 * Default callback for slash commands
 *
 *
 * @param issue_number - The issue number
 * @param comment - Comment string
 */

const commandCallback = async (issue_number: number, comment: string, action: string, reply_to?: Comment) => {
  await upsertCommentToIssue(issue_number, comment, action, reply_to);
};

export const userCommands = (): UserCommands[] => {
  const config = getBotConfig();

  return [
    {
      id: IssueCommentCommands.START,
      description: "Assign the origin sender to the issue automatically.",
      handler: assign,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.STOP,
      description: "Unassign the origin sender from the issue automatically.",
      handler: unassign,
      callback: commandCallback,
    },
    {
      handler: listAvailableCommands,
      id: IssueCommentCommands.HELP,
      description: "List all available commands.",
      callback: commandCallback,
    },
    // Commented out until Gnosis Safe is integrated (https://github.com/ubiquity/ubiquibot/issues/353)
    /*{
    id: IssueCommentCommands.PAYOUT,
    description: "Disable automatic payment for the issue.",
    handler: payout,
    callback: commandCallback,
  },*/
    {
      id: IssueCommentCommands.AUTOPAY,
      description: "Toggle automatic payment for the completion of the current issue.",
      handler: autoPay,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.QUERY,
      description: `Comments the users multiplier and address`,
      handler: query,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.ASK,
      description: `Ask a technical question to the Ubiquity AI. \n  example usage: "/ask How do I do X?"`,
      handler: ask,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.MULTIPLIER,
      description: `Set the bounty payout multiplier for a specific contributor, and provide the reason for why. \n  example usage: "/wallet @user 0.5 'Multiplier reason'"`,
      handler: multiplier,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.ALLOW,
      description: `Set access control. (Admin Only)`,
      handler: setAccess,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.AUTHORIZE,
      description: `Approve a label change. Superuser only.`,
      handler: approveLabelChange,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.WALLET,
      description: config.wallet.registerWalletWithVerification
        ? `<WALLET_ADDRESS | ENS_NAME> <SIGNATURE_HASH>: Register the hunter's wallet address. \n  Your message to sign is: DevPool\n  You can generate SIGNATURE_HASH at https://etherscan.io/verifiedSignatures\n  ex1: /wallet 0x0000000000000000000000000000000000000000 0xe2a3e34a63f3def2c29605de82225b79e1398190b542be917ef88a8e93ff9dc91bdc3ef9b12ed711550f6d2cbbb50671aa3f14a665b709ec391f3e603d0899a41b\n  ex2: /wallet vitalik.eth 0x75329f883590507e581cd6dfca62680b6cd12e1f1665db8097f9e642ed70025146b5cf9f777dde90c4a9cbd41500a6bf76bc394fd0b0cae2aab09f7a6f30e3b31b\n`
        : `<WALLET_ADDRESS | ENS_NAME>: Register the hunter's wallet address. \n  ex1: /wallet 0x0000000000000000000000000000000000000000\n  ex2: /wallet vitalik.eth\n`,
      handler: registerWallet,
      callback: commandCallback,
    },
  ];
};
