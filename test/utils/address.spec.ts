import { stub, SinonStub } from "sinon";
import { formatEthAddress, shortenEthAddress } from "../../src/utils";
import { expect } from "../../src/mocks";

describe("utils:address", () => {
  describe("#shortenEthAddress", () => {
    it("happy case", () => {
      const addr = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"; // vitalik.eth
      // 1. length is greater than 13
      expect(shortenEthAddress(addr, 15)).to.be.eq("0xd8da6b...aa96045");
      expect(shortenEthAddress(addr, 14)).to.be.eq("0xd8da6b...a96045");

      // 2. length is less than/equal to 13
      expect(shortenEthAddress(addr, 10)).to.be.eq("0xd8da...96045");
    });
  });
  describe("#formatEthAddress", () => {
    it("happy case", () => {
      const addr = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"; // vitalik.eth
      expect(formatEthAddress(addr)).to.be.eq("`0xd8da6bf26964af9d7eed9e03e53415d37aa96045`");
    });
  });
});
