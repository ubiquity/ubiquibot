import { abi as ERC20 } from '@openzeppelin/contracts/build/contracts/ERC20.json'
import EthersAdapter from '@gnosis.pm/safe-ethers-lib'
import Safe from '@gnosis.pm/safe-core-sdk'
import { SafeTransactionDataPartial } from '@gnosis.pm/safe-core-sdk-types'
import * as ethers from 'ethers'

export type PayoutParams = {
	network?: number;
	from: string;
	amount: string;
	token: string; // pass 0x00 to send ether
	to: string;
  execute?: boolean;
  gwei?: number;
}

export const providerKeyByChainId = new Map<number, string>([
  [1, process.env.RPC1_ALCHEMY_KEY as string],
  [5, process.env.RPC5_ALCHEMY_KEY as string], // goerli - safe compatable
])

export const payout = async (args: PayoutParams) => {
  // collect baseline info
  const tokenAddress = ethers.utils.getAddress(args.token)
  const isEth = tokenAddress === ethers.constants.AddressZero
  const destinationAddress = ethers.utils.getAddress(args.to)
  const privateKey = process.env.PRIVATE_KEY as string
  const network = args.network || 1
  const providerKey = providerKeyByChainId.get(network)
  if (!providerKey) {
    throw new Error(`chainId not supported: ${network}`)
  }
  const provider = new ethers.providers.AlchemyProvider(network, providerKey)
  const erc20 = new ethers.Contract(tokenAddress, ERC20, provider)
  const decimals = isEth ? 18 : await erc20.decimals()
  // pass x.0 if using an int otherwise shortened version will be provided
  const amount = args.amount.split('.').length === 1
    ? ethers.BigNumber.from(args.amount)
    : ethers.utils.parseUnits(args.amount, decimals)
  const safeAddress = args.from
  const currentBalance = await erc20.balanceOf(safeAddress) as ethers.BigNumber
  if (!currentBalance.gt(0)) {
    throw new Error(`safe balance of token too low: ERC20(${tokenAddress}).balanceOf(${safeAddress}) -> ${currentBalance.toString()}`)
  }

  // create safe if it does not exist
  const wallet = new ethers.Wallet(privateKey)
  const signer = wallet.connect(provider)
  const ethAdapter = new EthersAdapter({ ethers, signerOrProvider: signer, })
  const safe = await Safe.create({ ethAdapter, safeAddress })
  const safeTransactionData: SafeTransactionDataPartial = isEth ? {
    to: destinationAddress,
    value: amount.toHexString(),
    data: '0x',
  } : {
    to: tokenAddress,
    value: '0',
    data: erc20.interface.encodeFunctionData('transfer', [
      destinationAddress,
      amount.toString(),
    ]),
  }

  // broadcast tx
  const safeTransaction = await safe.createTransaction({ safeTransactionData })
  const options = args.gwei ? {
    gasPrice: args.gwei,
  } : {}
  if (args.execute) {
    const tx = await safe.executeTransaction(safeTransaction, options)
    const receipt = await tx.transactionResponse?.wait()
    return receipt
  } else {
    const txHash = await safe.getTransactionHash(safeTransaction)
    // high value approval only
    const approveTxResponse = await safe.approveTransactionHash(txHash, options)
    const receipt = await approveTxResponse.transactionResponse?.wait()
    return receipt
  }
}
