import { PriceConfig } from "../types";

export const DefaultPriceConfig: PriceConfig = {
  baseMultiplier: 1000,
  timeLabels: [
    {
      name: "Time: <1 Day",
      weight: 1,
      value: 3600 * 24,
      target: "Price: 100-1000 USD",
    },
    {
      name: "Time: <1 Week",
      weight: 2,
      value: 3600 * 24 * 7,
      target: "Price: 200-2000 USD",
    },
    {
      name: "Time: <2 Weeks",
      weight: 3,
      value: 3600 * 24 * 14,
      target: "Price: 300-3000 USD",
    },
    {
      name: "Time: <1 Month",
      weight: 4,
      value: 3600 * 24 * 30,
      target: "Price: 400-4000 USD",
    },
  ],
  profitLabels: [
    {
      name: "Profit: <10%",
      weight: 1,
      target: "Price: 100-400 USD",
    },
    {
      name: "Profit: <50%",
      weight: 5,
      target: "Price: 500-2000 USD",
    },
    {
      name: "Profit: <100%",
      weight: 10,
      target: "Price: 1000-4000 USD",
    },
    {
      name: "Profit: 100%+",
      weight: 20,
      target: "Price: 2000-8000 USD",
    },
  ],
};
