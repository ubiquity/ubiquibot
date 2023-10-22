import { _ } from "ajv";
import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import { extractEnsName } from "../../handlers";
import { Payload } from "../../types";
import { resolveAddress } from "../../helpers";
import { upsertWalletAddress } from "../../adapters/supabase";
import { ethers } from "ethers";

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
