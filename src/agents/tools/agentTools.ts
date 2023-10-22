import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import {
  calculateBountyPrice,
  deadLinePrefix,
  extractEnsName,
  getMultiplierInfoToDisplay,
  getTargetPriceLabel,
  isParentIssue,
  validatePriceLabels,
} from "../../handlers";
import { Comment, IssueType, LabelItem, Payload, UserType } from "../../types";
import {
  addAssignees,
  addCommentToIssue,
  addLabelToIssue,
  calculateDuration,
  calculateWeight,
  clearAllPriceLabelsOnIssue,
  createLabel,
  getAllIssueComments,
  getAllLabeledEvents,
  getAssignedIssues,
  getAvailableOpenedPullRequests,
  getLabel,
  getUserPermission,
  resolveAddress,
} from "../../helpers";
import { getWalletAddress, saveLabelChange, upsertWalletAddress } from "../../adapters/supabase";
import { ethers } from "ethers";
import { GLOBAL_STRINGS } from "../../configs";
import { tableComment } from "../../handlers/comment/handlers/table";
import OpenAI from "openai";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";
import { priorityAndTimeMsg } from "../utils/prompts";
import { setAccess } from "../../handlers/comment/handlers/allow";
import { watchLabelChange } from "../../handlers/label";

export async function askForUserInput(question: string) {
  const context = getBotContext();
  const payload = context.payload as Payload;

  if (!question) {
    return `Please ask a question`;
  }

  if (!payload.issue) {
    return `The payload does not contain an issue. Please try again.`;
  }

  const comment = question + `\n\n<!--- { 'UbiquityAI': 'askingForUserInput' } --->`;

  try {
    const actualComment = await context.octokit.issues.createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue.number,
      body: comment,
    });
    console.log("actualComment:", actualComment.data.node_id);
    return `Successfully asked for user input!`;
  } catch (error) {
    console.error("Error asking for user input:", error);
    return `Failed to ask for user input. Please try again later.`;
  }
}

export async function registerUserWallet(wallet?: string, _ensName?: string) {
  const { payload: _payload } = getBotContext();
  const config = getBotConfig();
  const logger = getLogger();
  const payload = _payload as Payload;
  const sender = payload.sender.login;

  if (!wallet && !_ensName) {
    return `Neither wallet nor ENS name was provided. Please try again.`;
  }

  let address: string | undefined = wallet;
  let ensName;

  if (_ensName) {
    ensName = extractEnsName(_ensName);
  }

  if (!address && ensName) {
    address = (await resolveAddress(ensName)) ?? undefined;
  }

  if (!address && wallet) {
    address = ethers.utils.getAddress(wallet);
  }

  if (!address) {
    return `Failed to resolve address, please try again.`;
  } else {
    if (config.wallet.registerWalletWithVerification) {
      const regexForSigHash = /(0x[a-fA-F0-9]{130})/g;
      const sigHashMatches = address.match(regexForSigHash);
      const sigHash = sigHashMatches ? sigHashMatches[0] : null;

      const messageToSign = "DevPool";
      const failedSigLogMsg = `Skipping to register the wallet address because you have not provided a valid SIGNATURE_HASH.`;
      const failedSigResponse = `Skipping to register the wallet address because you have not provided a valid SIGNATURE_HASH. \nUse [etherscan](https://etherscan.io/verifiedSignatures) to sign the message \`${messageToSign}\` and register your wallet by appending the signature hash.\n\n**Usage:**\n/wallet <WALLET_ADDRESS | ENS_NAME> <SIGNATURE_HASH>\n\n**Example:**\n/wallet 0x0000000000000000000000000000000000000000 0x0830f316c982a7fd4ff050c8fdc1212a8fd92f6bb42b2337b839f2b4e156f05a359ef8f4acd0b57cdedec7874a865ee07076ab2c81dc9f9de28ced55228587f81c`;
      try {
        //verifyMessage throws an error when some parts(r,s,v) of the signature are correct but some are not
        const isSigHashValid = address && sigHash && ethers.utils.verifyMessage(messageToSign, sigHash) == ethers.utils.getAddress(address);
        if (!isSigHashValid) {
          logger.info(failedSigLogMsg);
          return failedSigResponse;
        }
      } catch (e) {
        logger.info(`Exception thrown by verifyMessage for /wallet: ${e}`);
        logger.info(failedSigLogMsg);
        return failedSigResponse;
      }
    }
    await upsertWalletAddress(sender, address);
    return `The wallet has been registered successfully!`;
  }
}

export async function assign(_issueNumber?: number, _username?: string) {
  const { payload: _payload } = getBotContext();
  const logger = getLogger();
  const config = getBotConfig();

  console.log("====================================");
  console.log(`issueNumber: ${_issueNumber}`);
  console.log(`username: ${_username}`);
  console.log("====================================");

  const payload = _payload as Payload;
  const { repository, organization } = payload;

  const id = organization?.id || repository?.id; // repository?.id as fallback

  const staleBounty = config.assign.staleBountyTime;
  const startEnabled = config.command.find((command) => command.name === "start");

  logger.info(`Received '/agent assign' command from user: ${payload.sender.login}`);
  const issue = (_payload as Payload).issue;

  if (!issue) {
    logger.info(`Skipping '/agent assign' because of no issue instance`);
    return "Skipping '/agent assign' because of no issue instance";
  }

  if (!startEnabled?.enabled) {
    logger.info(`Ignore '/agent assign' command from user: ASSIGN_COMMAND_ENABLED config is set false`);
    return GLOBAL_STRINGS.assignCommandDisabledComment;
  }

  if (issue.body && isParentIssue(issue.body)) {
    logger.info(`Ignore '/agent assign' command from user: identified as parent issue`);
    return GLOBAL_STRINGS.ignoreStartCommandForParentIssueComment;
  }

  const openedPullRequests = await getAvailableOpenedPullRequests(payload.sender.login);
  logger.info(`Opened Pull Requests with approved reviews or with no reviews but over 24 hours have passed: ${JSON.stringify(openedPullRequests)}`);

  const assignedIssues = await getAssignedIssues(payload.sender.login);
  logger.info(`Max issue allowed is ${config.assign.bountyHunterMax}`);

  // check for max and enforce max
  if (assignedIssues.length - openedPullRequests.length >= config.assign.bountyHunterMax) {
    return `Too many assigned issues, you have reached your max of ${config.assign.bountyHunterMax}`;
  }

  if (issue.state == IssueType.CLOSED) {
    logger.info("Skipping '/agent assign', reason: closed ");
    return "Skipping `/start` since the issue is closed";
  }
  const _assignees = payload.issue?.assignees;
  const assignees = _assignees ?? [];

  if (assignees.length !== 0) {
    logger.info(`Skipping '/agent assign', reason: already assigned. assignees: ${assignees.length > 0 ? assignees.map((i) => i.login).join() : "NoAssignee"}`);
    return "Skipping `/start` since the issue is already assigned";
  }

  // get the time label from the `labels`
  const labels = payload.issue?.labels;
  if (!labels) {
    logger.info(`No labels to calculate timeline`);
    return "Skipping `/start` since no issue labels are set to calculate the timeline";
  }
  const timeLabelsDefined = config.price.timeLabels;
  const timeLabelsAssigned: LabelItem[] = [];
  for (const _label of labels) {
    const _labelType = typeof _label;
    const _labelName = _labelType === "string" ? _label.toString() : _labelType === "object" ? _label.name : "unknown";

    const timeLabel = timeLabelsDefined.find((item) => item.name === _labelName);
    if (timeLabel) {
      timeLabelsAssigned.push(timeLabel);
    }
  }

  if (timeLabelsAssigned.length == 0) {
    logger.info(`No time labels to calculate timeline`);
    return "Skipping `/start` since no time labels are set to calculate the timeline";
  }

  const sorted = timeLabelsAssigned.sort((a, b) => calculateWeight(a) - calculateWeight(b));
  const targetTimeLabel = sorted[0];
  const duration = calculateDuration(targetTimeLabel);
  if (!duration) {
    logger.info(`Missing configure for time label: ${targetTimeLabel.name}`);
    return "Skipping `/start` since configuration is missing for the following labels";
  }

  const startTime = new Date().getTime();
  const endTime = new Date(startTime + duration * 1000);

  const comment = {
    deadline: endTime.toUTCString().replace("GMT", "UTC"),
    wallet: (await getWalletAddress(payload.sender.login)) || "Please set your wallet address to use `/wallet 0x0000...0000`",
    commit: `@${payload.sender.login} ${deadLinePrefix} ${endTime.toUTCString()}`,
    tips: `<h6>Tips:</h6>
      <ul>
      <li>Use <code>/wallet 0x0000...0000</code> if you want to update your registered payment wallet address @${payload.sender.login}.</li>
      <li>Be sure to open a draft pull request as soon as possible to communicate updates on your progress.</li>
      <li>Be sure to provide timely updates to us when requested, or you will be automatically unassigned from the bounty.</li>
      <ul>`,
  };

  if (!assignees.map((i) => i.login).includes(payload.sender.login)) {
    logger.info(`Adding the assignee: ${payload.sender.login}`);
    await addAssignees(issue.number, [payload.sender.login]);
  }

  let days: number | undefined;
  let staleToDays: number | undefined;
  let isBountyStale = false;

  if (staleBounty !== 0) {
    days = Math.floor((new Date().getTime() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60 * 24));
    staleToDays = Math.floor(staleBounty / (1000 * 60 * 60 * 24));
    isBountyStale = days >= staleToDays;
  }

  // double check whether the assign message has been already posted or not
  logger.info(`Creating an issue comment: ${comment.commit}`);
  const issueComments = await getAllIssueComments(issue.number);
  const comments = issueComments.sort((a: Comment, b: Comment) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latestComment = comments.length > 0 ? comments[0].body : undefined;
  if (latestComment && comment.commit != latestComment) {
    const { multiplier, reason, bounty } = await getMultiplierInfoToDisplay(payload.sender.login, id?.toString(), issue);
    return tableComment({ ...comment, multiplier, reason, bounty, isBountyStale, days }) + comment.tips;
  }
  return;
}

export async function calculatePriorityAndDuration(chatHistory: CreateChatCompletionRequestMessage[]) {
  const { payload: _payload } = getBotContext();
  const context = getBotContext();
  const config = getBotConfig();
  const payload = context.payload as Payload;
  const issue = (_payload as Payload).issue;

  if (!issue?.number) {
    return `No issue number found. Please try again.`;
  }

  const accessLevel = await getUserPermission(payload.sender.login, context);
  if (accessLevel !== "admin") {
    await setAccess("/allow set-priority set-time @ubqbot true");
  }
  const openAI = new OpenAI({
    apiKey: config.ask.apiKey,
  });

  const spec = issue.body;

  chatHistory.push(
    {
      role: "system",
      content: priorityAndTimeMsg,
    },
    {
      role: "assistant",
      content: spec,
    }
  );

  const response = await openAI.chat.completions.create({
    messages: chatHistory,
    model: "gpt-3.5-turbo-16k-0613",
    max_tokens: config.ask.tokenLimit,
    temperature: 0,
  });

  const responseText = response.choices[0].message.content;

  const pRegex = /Priority: [1-5] \((Normal|Medium|High|Urgent|Emergency)\)/g;
  const tRegex = /Time: <[1-7] (Hour|Hours|Day|Days|Week|Weeks)/g;

  console.log("====================================");
  console.log(`responseText: ${responseText}`);
  console.log("====================================");

  const priority = responseText?.match(pRegex)?.[0] ?? "";
  const time = responseText?.match(tRegex)?.[0] ?? "";

  console.log("====================================");
  console.log(`priority: ${priority}`);
  console.log(`time: ${time}`);
  console.log("====================================");

  if (!priority || !time) {
    return `Failed to find the priority or time. Please try again.`;
  }

  const timeLabels = config.price.timeLabels;
  const timeLabelItem = timeLabels.find((label) => label.name === time);
  if (!timeLabelItem) {
    return `Failed to find the time label. Please try again.`;
  }

  const priorityLabels = config.price.priorityLabels;
  const priorityLabelItem = priorityLabels.find((label) => label.name === priority);
  if (!priorityLabelItem) {
    return `Failed to find the priority label. Please try again.`;
  }

  const timeLabelWeight = calculateWeight(timeLabelItem);
  const priorityLabelWeight = calculateWeight(priorityLabelItem);
  const bounty = calculateBountyPrice(timeLabelWeight, priorityLabelWeight, config.price.baseMultiplier);

  const { multiplier, reason } = await getMultiplierInfoToDisplay(payload.sender.login, payload.repository.id.toString(), issue);

  const deadline = new Date(Date.now() + timeLabelWeight * 1000).toUTCString().replace("GMT", "UTC");

  const comment = {
    deadline,
    wallet: (await getWalletAddress(payload.sender.login)) || "Please set your wallet address to use `/wallet 0x0000...0000`",
    commit: `@${payload.sender.login} ${deadLinePrefix} ${deadline}`,
    tips: `<h6>Tips:</h6>
        <ul>
        <li>Use <code>/wallet 0x0000...0000</code> if you want to update your registered payment wallet address @${payload.sender.login}.</li>
        <li>Be sure to open a draft pull request as soon as possible to communicate updates on your progress.</li>
        <li>Be sure to provide timely updates to us when requested, or you will be automatically unassigned from the bounty.</li>
        <ul>`,
  };

  const bString = bounty.toString();

  await validatePriceLabels();
  await pricingLabelLogic();
  await watchLabelChange();
  return tableComment({ ...comment, multiplier, reason, bounty: bString, isBountyStale: false, days: undefined }) + comment.tips + `<br/> ${responseText}`;
}

export async function setPriorityAndDuration(issueNumber: number, priority: string, time: string) {
  const context = getBotContext();
  const payload = context.payload as Payload;

  if (!payload.issue) {
    return `The payload does not contain an issue. Please try again.`;
  }

  const { repository, label, changes, sender } = payload;

  const { full_name } = repository;

  const previousLabel = changes?.name.from;
  const currentLabel = label?.name;
  const triggerUser = sender.login;

  console.log("====================================");
  console.log(`issueNumber: ${issueNumber}`);
  console.log(`priority: ${priority}`);
  console.log(`time: ${time}`);
  console.log("====================================");

  try {
    await context.octokit.issues.update({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue.number,
      labels: [priority, time],
    });
    await validatePriceLabels();
    await pricingLabelLogic();
    await saveLabelChange(triggerUser, full_name, previousLabel ?? "notPrevSet", currentLabel ?? "", true);
    return `Successfully set labels!`;
  } catch (error) {
    console.error("Error setting labels:", error);
    return `Failed to set labels. Please try again later.`;
  }
}

export const pricingLabelLogic = async (): Promise<void> => {
  const context = getBotContext();
  const config = getBotConfig();
  const logger = getLogger();
  const payload = context.payload as Payload;
  if (!payload.issue) return;
  const labels = payload.issue.labels;
  const labelNames = labels.map((i) => i.name);
  logger.info(`Checking if the issue is a parent issue.`);
  if (payload.issue.body && isParentIssue(payload.issue.body)) {
    logger.error("Identified as parent issue. Disabling price label.");
    const issuePrices = labels.filter((label) => label.name.toString().startsWith("Price:"));
    if (issuePrices.length) {
      await addCommentToIssue(GLOBAL_STRINGS.skipPriceLabelGenerationComment, payload.issue.number);
      await clearAllPriceLabelsOnIssue();
    }
    return;
  }

  const { assistivePricing } = config.mode;
  const timeLabels = config.price.timeLabels.filter((item) => labels.map((i) => i.name).includes(item.name));
  const priorityLabels = config.price.priorityLabels.filter((item) => labels.map((i) => i.name).includes(item.name));

  const minTimeLabel = timeLabels.length > 0 ? timeLabels.reduce((a, b) => (calculateWeight(a) < calculateWeight(b) ? a : b)).name : undefined;
  const minPriorityLabel = priorityLabels.length > 0 ? priorityLabels.reduce((a, b) => (calculateWeight(a) < calculateWeight(b) ? a : b)).name : undefined;

  const targetPriceLabel = getTargetPriceLabel(minTimeLabel, minPriorityLabel);

  if (targetPriceLabel) {
    const _targetPriceLabel = labelNames.find((name) => name.includes("Price") && name.includes(targetPriceLabel));

    if (_targetPriceLabel) {
      // get all issue events of type "labeled" and the event label includes Price
      let labeledEvents = await getAllLabeledEvents();
      if (!labeledEvents) return;

      labeledEvents = labeledEvents.filter((event) => event.label?.name.includes("Price"));
      if (!labeledEvents.length) return;

      // check if the latest price label has been added by a user
      if (labeledEvents[labeledEvents.length - 1].actor?.type == UserType.User) {
        logger.info(`Skipping... already exists`);
      } else {
        // add price label to issue becuase wrong price has been added by bot
        logger.info(`Adding price label to issue`);
        await clearAllPriceLabelsOnIssue();

        const exist = await getLabel(targetPriceLabel);

        if (assistivePricing && !exist) {
          logger.info(`${targetPriceLabel} doesn't exist on the repo, creating...`);
          await createLabel(targetPriceLabel, "price");
        }
        await addLabelToIssue(targetPriceLabel);
      }
    } else {
      // add price if there is none
      logger.info(`Adding price label to issue`);
      await clearAllPriceLabelsOnIssue();

      const exist = await getLabel(targetPriceLabel);

      if (assistivePricing && !exist) {
        logger.info(`${targetPriceLabel} doesn't exist on the repo, creating...`);
        await createLabel(targetPriceLabel, "price");
      }
      await addLabelToIssue(targetPriceLabel);
    }
  } else {
    await clearAllPriceLabelsOnIssue();
    logger.info(`Skipping action...`);
  }
};

// export async function openNewIssue({
//   title,
//   body,
//   assignees,
//   labels,
// }: {
//   title: string;
//   body: string;
//   assignees?: string[];
//   labels?: string[];
// }): Promise<string> {
//   const context = getBotContext();
//   const payload = context.payload as Payload;

//   try {
//     await context.octokit.issues.create({
//       owner: payload.repository.owner.login,
//       repo: payload.repository.name,
//       title,
//       body,
//       assignees,
//       labels,
//     });
//     return `Issue titled "${title}" has been opened successfully!`;
//   } catch (error) {
//     console.error("Error opening new issue:", error);
//     return `Failed to open a new issue. Please try again later.`;
//   }
// }

// export async function branchExists(branchName: string): Promise<boolean> {
//   const context = getBotContext();
//   const payload = context.payload as Payload;

//   const owner = payload.repository.owner.login;
//   const repo = payload.repository.name;

//   try {
//     await context.octokit.git.getRef({
//       owner,
//       repo,
//       ref: `heads/${branchName}`,
//     });
//     return true;
//   } catch (error) {
//     if (error.status === 404) {
//       return false;
//     }
//     throw error;
//   }
// }

// export async function createBranch(branchName: string, baseBranch: "development" | "main" = "main") {
//   const context = getBotContext();
//   const payload = context.payload as Payload;

//   const owner = payload.repository.owner.login;
//   const repo = payload.repository.name;

//   const { data: ref } = await context.octokit.git.getRef({
//     owner,
//     repo,
//     ref: `heads/${baseBranch}`,
//   });
//   const sha = ref.object.sha;

//   await context.octokit.git.createRef({
//     owner,
//     repo,
//     ref: `refs/heads/${branchName}`,
//     sha,
//   });
// }

// export async function createOrUpdateFile(path: string, content: string, branchName: string) {
//   const context = getBotContext();
//   const payload = context.payload as Payload;

//   const owner = payload.repository.owner.login;
//   const repo = payload.repository.name;

//   try {
//     await context.octokit.repos.getContent({ owner, repo, path, ref: branchName });

//     await context.octokit.repos.createOrUpdateFileContents({
//       owner,
//       repo,
//       path,
//       message: `Update ${path}`,
//       content: Buffer.from(content).toString("base64"),
//       branch: branchName,
//     });
//   } catch (error) {
//     if (error.status === 404) {
//       await context.octokit.repos.createOrUpdateFileContents({
//         owner,
//         repo,
//         path,
//         message: `Create ${path}`,
//         content: Buffer.from(content).toString("base64"),
//         branch: branchName,
//       });
//     } else {
//       throw error;
//     }
//   }
// }

// export async function openNewPullRequest({
//   title,
//   body,
//   headBranch,
//   baseBranch = "development" || "main",
// }: {
//   title: string;
//   body: string;
//   headBranch: string;
//   baseBranch?: string;
// }): Promise<string> {
//   const context = getBotContext();
//   const payload = context.payload as Payload;

//   try {
//     await context.octokit.pulls.create({
//       owner: payload.repository.owner.login,
//       repo: payload.repository.name,
//       title,
//       body,
//       head: headBranch,
//       base: baseBranch,
//     });
//     return `Pull request titled "${title}" has been opened successfully from ${headBranch} to ${baseBranch}!`;
//   } catch (error) {
//     console.error("Error opening new pull request:", error);
//     return `Failed to open a new pull request. Please try again later.`;
//   }
// }
