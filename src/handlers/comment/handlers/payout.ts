import Runtime from "../../../bindings/bot-runtime";
import { Context, Payload } from "../../../types";
import { isUserAdminOrBillingManager } from "../../../helpers/issue";

export async function autoPay(context: Context, body: string) {
  const runtime = Runtime.getState();
  const payload = context.event.payload as Payload;
  const logger = runtime.logger;

  logger.info(context.event, "Running '/autopay' command handler", { sender: payload.sender.login });

  const pattern = /^\/autopay (true|false)$/;
  const autopayCommand = body.match(pattern);

  if (autopayCommand) {
    const hasSufficientPrivileges = await isUserAdminOrBillingManager(context, payload.sender.login);
    if (!hasSufficientPrivileges) {
      return logger.warn(
        context.event,
        "You must be an 'admin' or 'billing_manager' to toggle automatic payments for completed issues."
      );
    }
    return logger.ok(context.event, "Automatic payment for this issue state:", { autopayCommand });
  }
  return logger.warn(
    context.event,
    `Invalid command. Please use the following format: \`/autopay true\` or \`/autopay false\` to toggle automatic payments for completed issues.`
  );
}
