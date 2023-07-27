import { DEFAULT_RPC_ENDPOINT } from "../configs";
import { getPayoutConfigByChainId } from "../helpers";

jest.mock("../configs");

describe("Helpers", () => {
  it("should return the payout config for a valid chainId", () => {
    const chainId = 1;
    const expectedConfig = {
      rpc: DEFAULT_RPC_ENDPOINT,
      paymentToken: "0x6B175474E89094C44Da98b954EedeAC495271d0F", //DAI
    };

    const result = getPayoutConfigByChainId(chainId);

    expect(result).toEqual(expectedConfig);
  });
});
