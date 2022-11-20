import * as ethers from 'ethers';
export type PayoutParams = {
    network?: number;
    from: string;
    amount: string;
    token: string;
    to: string;
    execute?: boolean;
    gwei?: number;
};
export declare const providerKeyByChainId: Map<number, string>;
export declare const payout: (args: PayoutParams) => Promise<ethers.ethers.ContractReceipt | undefined>;
