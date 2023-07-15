//import { PriceConfig } from "../types";
import { MarkdownItem } from "../types/markdown";
import { DefaultPriceConfig } from "../configs/price";

describe("DefaultPriceConfig", () => {
  it("should have the correct baseMultiplier", () => {
    expect(DefaultPriceConfig.baseMultiplier).toEqual(1000);
  });

  it("should have the correct issueCreatorMultiplier", () => {
    expect(DefaultPriceConfig.issueCreatorMultiplier).toEqual(2000);
  });

  it("should have the correct timeLabels", () => {
    const expectedTimeLabels = [
      {
        name: "Time: <1 Hour",
        weight: 0.125,
        value: 3600,
      },
      {
        name: "Time: <1 Day",
        weight: 1,
        value: 3600 * 24,
      },
      {
        name: "Time: <1 Week",
        weight: 2,
        value: 3600 * 24 * 7,
      },
      {
        name: "Time: <2 Weeks",
        weight: 3,
        value: 3600 * 24 * 14,
      },
      {
        name: "Time: <1 Month",
        weight: 4,
        value: 3600 * 24 * 30,
      },
    ];

    expect(DefaultPriceConfig.timeLabels).toEqual(expectedTimeLabels);
  });

  it("should have the correct priorityLabels", () => {
    const expectedPriorityLabels = [
      {
        name: "Priority: 0 (Normal)",
        weight: 1,
      },
      {
        name: "Priority: 1 (Medium)",
        weight: 2,
      },
      {
        name: "Priority: 2 (High)",
        weight: 3,
      },
      {
        name: "Priority: 3 (Urgent)",
        weight: 4,
      },
      {
        name: "Priority: 4 (Emergency)",
        weight: 5,
      },
    ];

    expect(DefaultPriceConfig.priorityLabels).toEqual(expectedPriorityLabels);
  });

  it("should have the correct commentElementPricing", () => {
    const expectedCommentElementPricing = {
      [MarkdownItem.Text]: 0.1,
      [MarkdownItem.Link]: 0.5,
      [MarkdownItem.List]: 0.5,
      [MarkdownItem.Code]: 5,
      [MarkdownItem.Image]: 5,
    };

    expect(DefaultPriceConfig.commentElementPricing).toEqual(expectedCommentElementPricing);
  });
});
