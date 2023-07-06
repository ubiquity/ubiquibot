import { PriceConfig } from "../types";
import { MarkdownItem } from "../types/markdown";

export const DefaultPriceConfig: PriceConfig = {
  baseMultiplier: 1000,
  issueCreatorMultiplier: 2000,
  timeLabels: [
    {
      name: "Time: <1 Hour",
      weight: 0.125,
    },
    {
      name: "Time: <1 Day",
      weight: 1,
    },
    {
      name: "Time: <1 Week",
      weight: 2,
    },
    {
      name: "Time: <2 Weeks",
      weight: 3,
    },
    {
      name: "Time: <1 Month",
      weight: 4,
    },
  ],
  priorityLabels: [
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
  ],
  commentElementPricing: {
    [MarkdownItem.Text]: 0.1,
    [MarkdownItem.Link]: 0.5,
    [MarkdownItem.List]: 0.5,
    [MarkdownItem.Code]: 5,
    [MarkdownItem.Image]: 5,
  },
};
