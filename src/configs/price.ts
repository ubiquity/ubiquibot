import { PriceConfig } from "../types";

export const DefaultPriceConfig: PriceConfig = {
  baseMultiplier: 1000,
  issueCreatorMultiplier: 2000,
  timeLabels: [
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
  incentives: {
    comment: {
      elements: {
        li: 1,
      },
      totals: {
        word: 0.1,
      },
    },
  },
  defaultLabels: [],
};
