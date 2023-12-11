import { isUserAdminOrBillingManager } from "../../../helpers/issue";
import { Context } from "../../../types/context";
import { GitHubPayload } from "../../../types/payload";

export async function autoPay(context: Context, body: string) {
  const payload = context.event.payload as GitHubPayload;
  const logger = context.logger;

  logger.info("Running '/autopay' command handler", { sender: payload.sender.login });

  const pattern = /^\/autopay (true|false)$/;
  const autopayCommand = body.match(pattern);

  if (autopayCommand) {
    const hasSufficientPrivileges = await isUserAdminOrBillingManager(context, payload.sender.login);
    if (!hasSufficientPrivileges) {
      return logger.error(
        "You must be an 'admin' or 'billing_manager' to toggle automatic payments for completed issues."
      );
    }
    return context.logger.ok("Automatic payment for this issue state:", { autopayCommand });
  }
  return logger.error(
    `Invalid command. Please use the following format: \`/autopay true\` or \`/autopay false\` to toggle automatic payments for completed issues.`
  );
}
