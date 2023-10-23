import Decimal from "decimal.js";
import { BigNumber, ethers } from "ethers";
import Runtime from "../../../../bindings/bot-runtime";
import {
  getAllIssueAssignEvents,
  getAllIssueComments,
  getPayoutConfigByNetworkId,
  getTokenSymbol,
} from "../../../../helpers";
// import { Payload } from "../../../../types";
import { Payload, Context } from "../../../../types";

// type IssuePayload = Context<"issues.reopened">; // ["payload"]

export async function issueReopened(context: Context) {
  const runtime = Runtime.getState();
  const { logger } = runtime;
  // if (!eventContext) {
  //   throw new Error("No event context found");
  // }

  const payload = context.event.payload as Payload;
  const issue = payload.issue;

  if (!issue) throw logger.error("No issue found in payload", payload);

  const comments = await getAllIssueComments(context, issue.number);
  const permitBaseUrl = context.config.payout.permitBaseUrl;
  const claimUrlRegex = new RegExp(`\\((${permitBaseUrl}\\?claim=\\S+)\\)`);
  const permitComment = comments.find((e) => e.user.type === "Bot" && e.body.match(claimUrlRegex));

  if (permitComment) {
    const permitUrl = permitComment.body.match(claimUrlRegex);
    if (!permitUrl || permitUrl.length < 2) {
      return logger.warn(`Permit URL not found`);
    }

    const url = new URL(permitUrl[1]);
    const claimBase64 = url.searchParams.get("claim");
    if (!claimBase64) {
      return logger.warn(`Permit claim search parameter not found`);
    }

    const networkId = url.searchParams.get("network") || "1";
    const { rpc } = getPayoutConfigByNetworkId(Number(networkId));
    const claim = JSON.parse(Buffer.from(claimBase64, "base64").toString("utf-8"));

    const amount = BigNumber.from(claim.permit.permitted.amount);
    const formattedAmount = ethers.utils.formatUnits(amount, 18);
    const tokenAddress = claim.permit.permitted.token;
    const tokenSymbol = await getTokenSymbol(tokenAddress, rpc);

    const events = await getAllIssueAssignEvents(context, issue.number);
    if (events.length === 0) {
      return logger.warn(`No assignment found`);
    }

    const assignee = events[0].assignee.login;

    if (parseFloat(formattedAmount) > 0) {
      try {
        const { debit } = runtime.adapters.supabase;
        await debit.addDebit({
          userId: events[0].assignee.id,
          amount: new Decimal(formattedAmount),
          networkId: Number(networkId),
          address: tokenAddress,
        });
      } catch (err) {
        throw logger.error(`Error writing penalty to db`, err);
      }

      // TODO: make sure that we can tag the assignee (so cant be a diff) by returning a special log type that uses a normal font
      // return logger.warn("Penalty added", { amount: formattedAmount, tokenSymbol, assignee });
      // await addCommentToIssue(
      return `@${assignee} please be sure to review this conversation and implement any necessary fixes. Unless this is closed as completed, its payment of **${formattedAmount} ${tokenSymbol}** will be deducted from your next task.`;
      //   issue.number
      // );
    } else {
      logger.info(`Skipped penalty because amount is 0`);
    }
  }
  return logger.info(`No permit comment found`);
}
