import { MaxUint256, PERMIT2_ADDRESS, PermitTransferFrom, SignatureTransfer } from "@uniswap/permit2-sdk";
import Decimal from "decimal.js";
import { BigNumber, ethers } from "ethers";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import Runtime from "../../../../bindings/bot-runtime";
import { Context } from "../../../../types";
import { getPayoutConfigByNetworkId } from "../../../../helpers";
import { decryptKeys } from "../../../../utils/private";

export async function generatePermit2Signature(
  context: Context,
  { beneficiary, amount, identifier, userId }: GeneratePermit2SignatureParams
) {
  const runtime = Runtime.getState();
  const {
    payments: { evmNetworkId },
    keys: { evmPrivateEncrypted },
  } = context.config;
  const { rpc, paymentToken } = getPayoutConfigByNetworkId(evmNetworkId);
  const { privateKey } = await decryptKeys(evmPrivateEncrypted);

  if (!rpc) throw runtime.logger.error("RPC is not defined");
  if (!privateKey) throw runtime.logger.error("Private key is not defined");
  if (!paymentToken) throw runtime.logger.error("Payment token is not defined");

  let provider;
  let adminWallet;
  try {
    provider = new ethers.providers.JsonRpcProvider(rpc);
  } catch (error) {
    throw runtime.logger.debug("Failed to instantiate provider", error);
  }

  try {
    adminWallet = new ethers.Wallet(privateKey, provider);
  } catch (error) {
    throw runtime.logger.debug("Failed to instantiate wallet", error);
  }

  const permitTransferFromData: PermitTransferFrom = {
    permitted: {
      token: paymentToken,
      amount: ethers.utils.parseUnits(amount.toString(), 18),
    },
    spender: beneficiary,
    nonce: BigNumber.from(keccak256(toUtf8Bytes(identifier + userId))),
    deadline: MaxUint256,
  };

  const { domain, types, values } = SignatureTransfer.getPermitData(
    permitTransferFromData,
    PERMIT2_ADDRESS,
    evmNetworkId
  );

  const signature = await adminWallet._signTypedData(domain, types, values).catch((error) => {
    throw runtime.logger.debug("Failed to sign typed data", error);
  });

  const transactionData: TransactionData = {
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

  // const transactionDataV2 = {
  //   token: permitTransferFromData.permitted.token,
  //   nonce: permitTransferFromData.nonce.toString(),
  //   deadline: permitTransferFromData.deadline.toString(),
  //   beneficiary: permitTransferFromData.spender,
  //   amount: permitTransferFromData.permitted.amount.toString(),
  // };

  const base64encodedTxData = Buffer.from(JSON.stringify(transactionData)).toString("base64");

  const url = new URL("https://pay.ubq.fi/");
  url.searchParams.append("claim", base64encodedTxData);
  url.searchParams.append("network", evmNetworkId.toString());

  runtime.logger.info("Generated permit2 signature", { transactionData, url: url.toString() });

  return { transactionData, url };
}
interface GeneratePermit2SignatureParams {
  beneficiary: string;
  amount: Decimal;
  identifier: string;
  userId: string;
}

interface TransactionData {
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
}
