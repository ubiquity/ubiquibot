import { getBotContext, getLogger } from "../../../bindings";
import { Payload } from "../../../types";
import { IssueCommentCommands } from "../commands";
import { handleIssueClosed } from "../../payout";
import { getAllIssueComments, getUserPermission } from "../../../helpers";
import { GLOBAL_STRINGS } from "../../../configs";

export const payout = async (body: string) => {
  const { payload: _payload } = getBotContext();
  const logger = getLogger();
  if (body != IssueCommentCommands.PAYOUT && body.replace(/`/g, "") != IssueCommentCommands.PAYOUT) {
    logger.info(`Skipping to payout. body: ${body}`);
    return;
  }

  const payload = _payload as Payload;
  logger.info(`Received '/payout' command from user: ${payload.sender.login}`);
  const issue = (_payload as Payload).issue;
  if (!issue) {
    logger.info(`Skipping '/payout' because of no issue instance`);
    return;
  }

  const _labels = payload.issue?.labels;
  if (_labels?.some((e) => e.name.toLowerCase() === "Permitted".toLowerCase())) {
    logger.info(`Permit already generated for ${payload.issue?.number}`);
    return;
  }

  const IssueComments = await getAllIssueComments(issue.number);
  if (IssueComments.length === 0) {
    return `Permit generation failed due to internal GitHub Error`;
  }

  const hasPosted = IssueComments.find((e) => e.user.type === "Bot" && e.body.includes("https://pay.ubq.fi?claim"));
  if (hasPosted) {
    logger.info(`Permit already generated for ${payload.issue?.number}`);
    return;
  }

  const response = await handleIssueClosed();
  return response;
};

export const autoPay = async (body: string) => {
  const context = getBotContext();
  const _payload = context.payload;
  const logger = getLogger();

  const payload = _payload as Payload;
  logger.info(`Received '/autopay' command from user: ${payload.sender.login}`);

  const pattern = /^\/autopay (true|false)$/;
  const res = body.match(pattern);

  if (res) {
    const userPermission = await getUserPermission(payload.sender.login, context);
    if (userPermission !== "admin" && userPermission !== "billing_manager") {
      return "Permission required to set autopay mode.";
    }
    if (res.length > 1) {
      return `${GLOBAL_STRINGS.autopaycomment} **${res[1]}**`;
    }
  }
  return "Invalid body for autopay command: e.g. /autopay true|false";
};
