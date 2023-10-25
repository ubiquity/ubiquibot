/**
 * Helper functions for payout config
 *
 * We support payouts (permit2 + gnosis chain) for 2 networks:
 * - ethereum mainnet
 * - gnosis chain
 *
 * To support a new chain add RPC URL and payment token to the "getPayoutConfigByChainId()" method.
 * Notice that chain should be compatible with gelato network, i.e.:
 * 1. Gelato network should support the added chain (https://docs.gelato.network/developer-services/relay/api#oracles)
 * 2. Gelato network should support the added payment token (https://docs.gelato.network/developer-services/relay/api#oracles-chainid-paymenttokens)
 */

import Runtime from "../bindings/bot-runtime";
import { isUserAdminOrBillingManager } from "./issue";

// available tokens for payouts
export const PAYMENT_TOKEN_PER_NETWORK: Record<string, { rpc: string; token: string }> = {
  "1": {
    rpc: "https://rpc-bot.ubq.fi/v1/mainnet",
    token: "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
  },
  "100": {
    rpc: "https://rpc.gnosischain.com",
    token: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d", // WXDAI
  },
};

export function getPayoutConfigByNetworkId(evmNetworkId: number) {
  const paymentToken = PAYMENT_TOKEN_PER_NETWORK[evmNetworkId.toString()];
  if (!paymentToken) {
    throw new Error(`No config setup for evmNetworkId: ${evmNetworkId}`);
  }

  return {
    rpc: paymentToken.rpc,
    paymentToken: paymentToken.token,
  };
}

export async function hasLabelEditPermission(label: string, caller: string) {
  const runtime = Runtime.getState();
  const context = runtime.latestEventContext;
  const logger = runtime.logger;
  const sufficientPrivileges = await isUserAdminOrBillingManager(caller, context);

  // get text before :
  const match = label.split(":");
  if (match.length == 0) return false;

  if (sufficientPrivileges) {
    // check permission
    const { access, user } = Runtime.getState().adapters.supabase;
    const userId = await user.getUserId(caller);
    const accessible = await access.getAccess(userId);
    if (accessible) return true;
    logger.info("No access to edit label", { caller, label });
    return false;
  }

  return true;
}
