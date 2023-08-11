import { MaxUint256, PermitTransferFrom, SignatureTransfer } from "@uniswap/permit2-sdk";
import { BigNumber, ethers } from "ethers";
import { getBotConfig, getLogger } from "../bindings";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import Decimal from "decimal.js";

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3"; // same on all networks

/**
 * Generates permit2 signature data with `spender` and `amountInETH`
 *
 * @param spender The recipient address we're going to send tokens
 * @param amountInETH The token amount in ETH
 *
 * @returns Permit2 url including base64 encocded data
 */
export const generatePermit2Signature = async (spender: string, amountInEth: Decimal, identifier: string): Promise<string> => {
  const {
    payout: { networkId, privateKey, permitBaseUrl, rpc, paymentToken },
  } = getBotConfig();
  const logger = getLogger();
  const provider = new ethers.providers.JsonRpcProvider(rpc);
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
    nonce: BigNumber.from(keccak256(toUtf8Bytes(identifier))),
    // signature deadline
    deadline: MaxUint256,
  };

  const { domain, types, values } = SignatureTransfer.getPermitData(permitTransferFromData, PERMIT2_ADDRESS, networkId);

  const signature = await adminWallet._signTypedData(domain, types, values);
  const txData = {
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

  const result = `${permitBaseUrl}?claim=${base64encodedTxData}&network=${networkId}`;
  logger.info(`Generated permit2 url: ${result}`);
  return result;
};
