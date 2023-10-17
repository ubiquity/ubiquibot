import Runtime from "../../../bindings/bot-runtime";
import { Payload } from "../../../types";
import { isUserAdminOrBillingManager } from "../../../helpers/issue";

export async function autoPay(body: string) {
  const runtime = Runtime.getState();
  const context = runtime.latestEventContext;
  const payload = context.payload as Payload;
  const logger = runtime.logger;

  logger.info("Running '/autopay' command handler", { sender: payload.sender.login });

  const pattern = /^\/autopay (true|false)$/;
  const autopayCommand = body.match(pattern);

  if (autopayCommand) {
    const hasSufficientPrivileges = await isUserAdminOrBillingManager(payload.sender.login, context);
    if (!hasSufficientPrivileges) {
      return logger.warn(
        "You must be an 'admin' or 'billing_manager' to toggle automatic payments for completed issues."
      );
    }
    return logger.ok("Automatic payment for this issue state:", { autopayCommand });
  }
  return logger.warn(
    `Invalid command. Please use the following format: \`/autopay true\` or \`/autopay false\` to toggle automatic payments for completed issues.`
  );
}
