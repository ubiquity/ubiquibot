import { Context } from "../../types/context";

export async function addPenalty(context: Context) {
  return context.logger.debug("Need to reimplement penalty system");
  //   const { payload: _payload } = context;
  //   const {
  //     payout: { permitBaseUrl },
  //   } = context.config;
  //   const logger = context.logger;
  //   const issue = context.payload.issue;
  //   const repository = context.payload.repository;
  //   if (!issue) return;
  //   try {
  //     // find permit comment from the bot
  //     const comments = await getAllIssueComments(issue.number);
  //     const claimUrlRegex = new RegExp(`\\((${permitBaseUrl}\\?claim=\\S+)\\)`);
  //     const permitCommentIdx = comments.findIndex((e) => e.user.type === "Bot" && e.body.match(claimUrlRegex));
  //     if (permitCommentIdx === -1) {
  //       return;
  //     }

  //     // extract permit amount and token
  //     const permitComment = comments[permitCommentIdx];
  //     const permitUrl = permitComment.body.match(claimUrlRegex);
  //     if (!permitUrl || permitUrl.length < 2) {
  //       logger.error(`Permit URL not found`);
  //       return;
  //     }
  //     const url = new URL(permitUrl[1]);
  //     const claimBase64 = url.searchParams.get("claim");
  //     if (!claimBase64) {
  //       logger.error(`Permit claim search parameter not found`);
  //       return;
  //     }
  //     let networkId = url.searchParams.get("network");
  //     if (!networkId) {
  //       networkId = "1";
  //     }
  //     const { rpc } = getPayoutConfigByNetworkId(Number(networkId));
  //     let claim;
  //     try {
  //       claim = JSON.parse(Buffer.from(claimBase64, "base64").toString("utf-8"));
  //     } catch (err: unknown) {
  //       logger.error(`Error parsing claim: ${err}`);
  //       return;
  //     }
  //     const amount = BigNumber.from(claim.permit.permitted.amount);
  //     const formattedAmount = ethers.utils.formatUnits(amount, 18);
  //     const tokenAddress = claim.permit.permitted.token;
  //     const tokenSymbol = await getTokenSymbol(tokenAddress, rpc);

  //     // find latest assignment before the permit comment
  //     const events = await getAllIssueAssignEvents(issue.number);
  //     if (events.length === 0) {
  //       logger.error(`No assignment found`);
  //       return;
  //     }
  //     const assignee = events[0].assignee.login;

  //     if (parseFloat(formattedAmount) > 0) {
  //       // write penalty to db
  //       try {
  //         await addPenalty(assignee, repository.full_name, tokenAddress, networkId.toString(), amount);
  //       } catch (err) {
  //         logger.error(`Error writing penalty to db: ${err}`);
  //         return;
  //       }

  //       await addCommentToIssue(
  //         `@${assignee} please be sure to review this conversation and implement any necessary fixes. Unless this is closed as completed, its payment of **${formattedAmount} ${tokenSymbol}** will be deducted from your next bounty.`,
  //         issue.number
  //       );
  //     } else {
  //       logger.info(`Skipped penalty because amount is 0`);
  //     }
  //   } catch (err: unknown) {
  //     await addCommentToIssue(ErrorDiff(err), issue.number);
  //   }
}

// export async function addPenalty(
//   context: Context,
//   username: string,
//   repoName: string,
//   tokenAddress: string,
//   networkId: string,
//   penalty: string
// ) {
//   //   const { supabase } = Runtime.getState().adapters;
//   //   const logger = context.logger;
//   //   const { error } = await supabase.rpc("add_penalty", {
//   //     _username: username,
//   //     _repository_name: repoName,
//   //     _token_address: tokenAddress,
//   //     _network_id: networkId,
//   //     _penalty_amount: penalty.toString(),
//   //   });
//   //   logger.debug(`Adding penalty done, { data: ${JSON.stringify(error)}, error: ${JSON.stringify(error)} }`);
//   //   if (error) {
//   //     throw new Error(`Error adding penalty: ${error.message}`);
//   //   }
// }

// export async function getPenalty(
//   context: Context,
//   username: string,
//   repoName: string,
//   tokenAddress: string,
//   networkId: string
// ) {
//   //   const { supabase } = Runtime.getState().adapters;
//   //   const logger = context.logger;
//   //   const { data, error } = await supabase
//   //     .from("penalty")
//   //     .select("amount")
//   //     .eq("username", username)
//   //     .eq("repository_name", repoName)
//   //     .eq("network_id", networkId)
//   //     .eq("token_address", tokenAddress);
//   //   logger.debug(`Getting penalty done, { data: ${JSON.stringify(error)}, error: ${JSON.stringify(error)} }`);
//   //   if (error) {
//   //     throw new Error(`Error getting penalty: ${error.message}`);
//   //   }
//   //   if (data.length === 0) {
//   //     return BigNumber.from(0);
//   //   }
//   //   return BigNumber.from(data[0].amount);
// }

// export async function removePenalty(
//   context: Context,
//   username: string,
//   repoName: string,
//   tokenAddress: string,
//   networkId: string,
//   penalty: string
// ) {
//   //   const { supabase } = Runtime.getState().adapters;
//   //   const logger = context.logger;
//   //   const { error } = await supabase.rpc("remove_penalty", {
//   //     _username: username,
//   //     _repository_name: repoName,
//   //     _network_id: networkId,
//   //     _token_address: tokenAddress,
//   //     _penalty_amount: penalty,
//   //   });
//   //   logger.debug(`Removing penalty done, { data: ${JSON.stringify(error)}, error: ${JSON.stringify(error)} }`);
//   //   if (error) {
//   //     throw new Error(`Error removing penalty: ${error.message}`);
//   //   }
// }
