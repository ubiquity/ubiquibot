import { generateHelpMenu } from "../handlers/comment/handlers/index";

jest.mock("../handlers");
jest.mock("../configs");

describe("Help", () => {
  it("should generate log menu", () => {
    const helpMenu = generateHelpMenu();
    expect(helpMenu).toBeTruthy();
  });
});
