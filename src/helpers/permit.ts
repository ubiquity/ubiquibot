import { MaxUint256, PermitTransferFrom, SignatureTransfer } from "@uniswap/permit2-sdk";
import Decimal from "decimal.js";
import { BigNumber, ethers } from "ethers";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import Runtime from "../bindings/bot-runtime";
import { Payload } from "../types";
// import { savePermit } from "../adapters/supabase";

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3"; // same on all networks

// export type Permit = {
//   id: number;
//   createdAt: Date;
//   organizationId: number | null;
//   repositoryId: number;
//   issueId: number;
//   evmNetworkId: number;
//   contributorId: number;
//   contributorWallet: string;
//   tokenAddress: string;
//   payoutAmount: string;
//   nonce: string;
//   deadline: string;
//   signature: string;
//   partnerWallet: string;
// };

// export type InsertPermit = Omit<Permit, "id" | "createdAt">;

export type GeneratedPermit = {
  permit: {
    permitted: {
      token: string;
      amount: string;
    };
    nonce: string;
    deadline: string;
  };
  transferDetails: {
    to: string;
    requestedAmount: string;
  };
  owner: string;
  signature: string;
};

export const generatePermit2Signature = async (
  // Generates permit2 signature data with `spender` and `amountInETH`
  spender: string,
  amountInEth: Decimal,
  identifier: string,
  userId: number
): Promise<{ permit: GeneratedPermit; payoutUrl: string }> => {
  const {
    payout: { evmNetworkId, privateKey, permitBaseUrl, rpc, paymentToken },
  } = Runtime.getState().botConfig;
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  if (!privateKey) throw logger.error("No EVM private key found");
  const adminWallet = new ethers.Wallet(privateKey, provider);

  const permitTransferFromData: PermitTransferFrom = {
    permitted: {
      // token we are permitting to be transferred
      token: paymentToken,
      // amount we are permitting to be transferred
      amount: ethers.utils.parseUnits(amountInEth.toString(), 18),
    },
    // who can transfer the tokens
    spender: spender,
    nonce: BigNumber.from(keccak256(toUtf8Bytes(identifier + userId.toString()))),
    // signature deadline
    deadline: MaxUint256,
  };

  const { domain, types, values } = SignatureTransfer.getPermitData(
    permitTransferFromData,
    PERMIT2_ADDRESS,
    evmNetworkId
  );

  const signature = await adminWallet._signTypedData(domain, types, values);
  const txData: GeneratedPermit = {
    permit: {
      permitted: {
        token: permitTransferFromData.permitted.token,
        amount: permitTransferFromData.permitted.amount.toString(),
      },
      nonce: permitTransferFromData.nonce.toString(),
      deadline: permitTransferFromData.deadline.toString(),
    },
    transferDetails: {
      to: permitTransferFromData.spender,
      requestedAmount: permitTransferFromData.permitted.amount.toString(),
    },
    owner: adminWallet.address,
    signature: signature,
  };

  const base64encodedTxData = Buffer.from(JSON.stringify(txData)).toString("base64");

  const payoutUrl = `${permitBaseUrl}?claim=${base64encodedTxData}&network=${evmNetworkId}`;
  logger.info("Generated permit2 url: ", payoutUrl);
  return { permit: txData, payoutUrl };
};

export async function savePermitToDB(
  contributorId: number,
  txData: GeneratedPermit,
  evmNetworkId: number,
  organization: Payload["organization"]
) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;

  const context = runtime.eventContext;
  const payload = context.payload as Payload;
  const comment = payload.comment;
  if (!comment) throw logger.error("Cannot save permit to DB, missing comment");

  // const issue = payload.issue;
  // const repository = payload.repository;
  // const organization = payload.organization;
  // if (!issue || !repository) {
  //   logger.error("Cannot save permit to DB, missing issue, repository or organization");
  //   throw new Error("Cannot save permit to DB, missing issue, repository or organization");
  // }
  // const { payout } = Runtime.getState().botConfig;
  // const { evmNetworkId } = payout;
  const settlement = Runtime.getState().adapters.supabase.settlement;
  const permit: GeneratedPermit = {
    ...txData,
    // amount: txData.permit.permitted.amount,
    // nonce: txData.permit.nonce,
    // deadline: txData.permit.deadline,
    // signature: txData.signature,
    // beneficiary_id: contributorId,

    // token_id: await settlement.lookupTokenId(evmNetworkId, txData.permit.permitted.token),
  };

  // const creditResponse =
  await settlement.addCredit({
    userId: contributorId,
    amount: new Decimal(txData.transferDetails.requestedAmount),
    comment: comment,
    permit: permit,
    networkId: evmNetworkId,
    organization: organization,
    // address: txData.permit.permitted.token,
  });
  // const savedPermit = await savePermit(permit);
  logger.info("Saved permit to DB: ", permit);
  return permit;
}
