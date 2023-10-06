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

import { Static } from "@sinclair/typebox";
import { PayoutConfigSchema } from "../types";
import { isUserAdminOrBillingManager } from "./issue";
import { getBotContext, getLogger } from "../bindings";
// import { getAccessLevel } from "../adapters/supabase";

// available tokens for payouts
const PAYMENT_TOKEN_PER_NETWORK: Record<string, { rpc: string; token: string }> = {
  "1": {
    rpc: "https://rpc-bot.ubq.fi/v1/mainnet",
    token: "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
  },
  "100": {
    rpc: "https://rpc.gnosischain.com",
    token: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d", // WXDAI
  },
};

type PayoutConfigPartial = Omit<Static<typeof PayoutConfigSchema>, "evmNetworkId" | "privateKey" | "permitBaseUrl">;

/**
 * Returns payout config for a particular network
 * @param evmNetworkId network id
 * @returns RPC URL and payment token
 */
export const getPayoutConfigByNetworkId = (evmNetworkId: number): PayoutConfigPartial => {
  const paymentToken = PAYMENT_TOKEN_PER_NETWORK[evmNetworkId.toString()];
  if (!paymentToken) {
    throw new Error(`No config setup for evmNetworkId: ${evmNetworkId}`);
  }

  return {
    rpc: paymentToken.rpc,
    paymentToken: paymentToken.token,
  };
};

export async function hasLabelEditPermission(label: string, caller: string, repository: string) {
  const context = getBotContext();
  const logger = getLogger();
  const userCan = await isUserAdminOrBillingManager(caller, context);

  // get text before :
  const match = label.split(":");
  if (match.length == 0) return false;
  const label_type = match[0].toLowerCase();

  if (userCan) {
    // check permission
    const accessible = await getAccessLevel(caller, repository, label_type);
    if (accessible) return true;
    logger.info(`@${caller} is not allowed to edit label ${label}`);
    return false;
  }

  return true;
}
