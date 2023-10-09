import { MaxUint256, PermitTransferFrom, SignatureTransfer } from "@uniswap/permit2-sdk";
import { BigNumber, ethers } from "ethers";
import { getBotConfig, getBotContext, getLogger } from "../bindings";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import Decimal from "decimal.js";
import { Payload } from "../types";
import { savePermit } from "../adapters/supabase";
import { ERC20ABI } from "../configs";

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3"; // same on all networks

export type Permit = {
  id: number;
  createdAt: Date;
  organizationId: number | null;
  repositoryId: number;
  issueId: number;
  networkId: number;
  bountyHunterId: number;
  bountyHunterAddress: string;
  tokenAddress: string;
  payoutAmount: string;
  nonce: string;
  deadline: string;
  signature: string;
  walletOwnerAddress: string;
};

export type InsertPermit = Omit<Permit, "id" | "createdAt">;

type TxData = {
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

/**
 * Generates permit2 signature data with `spender` and `amountInTokens`
 *
 * @param spender The recipient address we're going to send tokens
 * @param amountInTokens The token amount
 *
 * @returns Permit2 url including base64 encoded data
 */
export const generatePermit2Signature = async (
  spender: string,
  amountInTokens: Decimal,
  identifier: string,
  userId = ""
): Promise<{ txData: TxData; payoutUrl: string }> => {
  const {
    payout: { networkId, privateKey, permitBaseUrl, rpc, paymentToken },
  } = getBotConfig();
  const logger = getLogger();
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const adminWallet = new ethers.Wallet(privateKey, provider);

  const tokenContract = new ethers.Contract(paymentToken, ERC20ABI, provider);
  const decimals = await tokenContract.decimals();

  const permitTransferFromData: PermitTransferFrom = {
    permitted: {
      // token we are permitting to be transferred
      token: paymentToken,
      // amount we are permitting to be transferred
      amount: ethers.utils.parseUnits(amountInTokens.toString(), decimals),
    },
    // who can transfer the tokens
    spender: spender,
    nonce: BigNumber.from(keccak256(toUtf8Bytes(identifier + userId))),
    // signature deadline
    deadline: MaxUint256,
  };

  const { domain, types, values } = SignatureTransfer.getPermitData(permitTransferFromData, PERMIT2_ADDRESS, networkId);

  const signature = await adminWallet._signTypedData(domain, types, values);
  const txData: TxData = {
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

  const payoutUrl = new URL(permitBaseUrl);
  payoutUrl.searchParams.append("claim", base64encodedTxData);
  payoutUrl.searchParams.append("network", networkId.toString());
  logger.info(`Generated permit2 of amount ${amountInTokens} for user ${spender}, url: ${payoutUrl}`);

  return { txData, payoutUrl: payoutUrl.toString() };
};

export const savePermitToDB = async (bountyHunterId: number, txData: TxData): Promise<Permit> => {
  const logger = getLogger();

  const context = getBotContext();
  const payload = context.payload as Payload;
  const issue = payload.issue;
  const repository = payload.repository;
  const organization = payload.organization;
  if (!issue || !repository) {
    logger.error("Cannot save permit to DB, missing issue, repository or organization");
    throw new Error("Cannot save permit to DB, missing issue, repository or organization");
  }

  const { payout } = getBotConfig();
  const { networkId } = payout;

  const permit: InsertPermit = {
    organizationId: organization?.id ?? null,
    repositoryId: repository?.id,
    issueId: issue?.id,
    networkId: networkId,
    bountyHunterId: bountyHunterId,
    tokenAddress: txData.permit.permitted.token,
    payoutAmount: txData.permit.permitted.amount,
    bountyHunterAddress: txData.transferDetails.to,
    nonce: txData.permit.nonce,
    deadline: txData.permit.deadline,
    signature: txData.signature,
    walletOwnerAddress: txData.owner,
  };

  const savedPermit = await savePermit(permit);
  logger.info(`Saved permit to DB: ${JSON.stringify(savedPermit)}`);
  return savedPermit;
};
