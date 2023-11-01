import { formatFString } from "../configs";

const varStrings = {
  askUpdate: "Do you have any updates {username}?",
  assignNotice: "The `/assign` command is disabled for this repository due to {reason}.",
  askPricing: "Using the /ask command, will cost you {price}.",
  manyVars: "{repo} is {status} as {reason}, it's {repoDesc}.",
};

describe("f-string utilities", () => {
  describe("formatFString", () => {
    it("should correctly format f-string with a valid input value", () => {
      const values1 = {
        username: "Keyrxng",
      };
      const expectedString1 = "Do you have any updates Keyrxng?";
      const result1 = formatFString(varStrings.askUpdate, values1);

      console.log(`Expected: ${expectedString1}\n Result: ${result1}`);
      expect(result1).toBe(expectedString1);

      const values2 = {
        reason: "maintenance",
      };
      const expectedString2 = "The `/assign` command is disabled for this repository due to maintenance.";
      const result2 = formatFString(varStrings.assignNotice, values2);

      console.log(`Expected: ${expectedString2}\n Result: ${result2}`);
      expect(result2).toBe(expectedString2);

      const values3 = {
        price: "$10",
      };
      const expectedString3 = "Using the /ask command, will cost you $10.";
      const result3 = formatFString(varStrings.askPricing, values3);

      console.log(`Expected: ${expectedString3}\n Result: ${result3}`);
      expect(result3).toBe(expectedString3);
    });

    it("should correctly format f-string with multiple input values", () => {
      const values = {
        repo: "Block#Builder",
        status: "no longer maintained",
        reason: "it's too boring",
        repoDesc: "used for building blocks",
      };
      const expectedString = "Block#Builder is no longer maintained as it's too boring, it's used for building blocks.";
      const result = formatFString(varStrings.manyVars, values);

      console.log(`Expected: ${expectedString}\n Result: ${result}`);
      expect(result).toBe(expectedString);
    });

    it("should throw error for missing input values using varStrings", () => {
      expect(() => formatFString(varStrings.askUpdate, {})).toThrowError("Missing value for variable: username");
    });
  });
});
