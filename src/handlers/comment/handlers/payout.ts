import Runtime from "../../../bindings/bot-runtime";
import { Payload } from "../../../types";
import { GLOBAL_STRINGS } from "../../../configs";
import { isUserAdminOrBillingManager } from "../../../helpers/issue";

export async function autoPay(body: string) {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const _payload = context.payload;
  const logger = runtime.logger;

  const payload = _payload as Payload;
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
      return `${GLOBAL_STRINGS.autopayComment} **${res[1]}**`;
    }
  }
  return "Invalid body for autopay command: e.g. /autopay false";
}
