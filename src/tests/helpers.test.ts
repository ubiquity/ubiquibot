import { DEFAULT_RPC_ENDPOINT } from "../configs";
import { getPayoutConfigByChainId } from "../helpers";

jest.mock("../configs");

describe("Helpers", () => {
  it("should return the payout config for a valid chainId", () => {
    const chainId = 1;
    const mainnetConfig = {
      rpc: DEFAULT_RPC_ENDPOINT,
      paymentToken: "0x6B175474E89094C44Da98b954EedeAC495271d0F", //DAI
    };

    const result = getPayoutConfigByChainId(chainId);

    expect(result).toEqual(mainnetConfig);
  });

  it("should return the payout config for valid GNOSIS ChainID", () => {
    const chainId = 100;
    const gnosisConfig = {
      rpc: "https://rpc.gnosischain.com",
      paymentToken: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d", //WXDAI
    };

    const result = getPayoutConfigByChainId(chainId);
    expect(result).toEqual(gnosisConfig);
  });
});
