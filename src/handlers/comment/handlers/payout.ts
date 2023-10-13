import Runtime from "../../../bindings/bot-runtime";
import { Payload } from "../../../types";
import { GLOBAL_STRINGS } from "../../../configs";
import { isUserAdminOrBillingManager } from "../../../helpers/issue";

export async function autoPay(body: string) {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const payload = context.payload as Payload;
  const logger = runtime.logger;

  logger.info(`Received '/autopay' command from user: ${payload.sender.login}`);

  const pattern = /^\/autopay (true|false)$/;
  const res = body.match(pattern);

  if (res) {
    const sufficientPrivileges = await isUserAdminOrBillingManager(payload.sender.login, context);
    if (sufficientPrivileges) {
      return logger.warn(
        "You must be an 'admin' or 'billing_manager' to toggle automatic payments for completed issues."
      );
    }
    if (res.length > 1) {
      return logger.ok(`${GLOBAL_STRINGS.autopayComment} **${res[1]}**`);
    }
  }
  return logger.warn(
    `Invalid command. Please use the following format: \`/autopay true\` or \`/autopay false\` to toggle automatic payments for completed issues.`
  );
}
