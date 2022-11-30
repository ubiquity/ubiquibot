import { PriceConfig } from "../types";

export const DefaultPriceConfig: PriceConfig = {
  baseMultiplier: 1000,
  timeLabels: [
    {
      name: "Time: <1 Day",
      weight: 1,
      target: "Price: 100-1000 USDC",
    },
    {
      name: "Time: <1 Week",
      weight: 2,
      target: "Price: 200-2000 USDC",
    },
    {
      name: "Time: <2 Weeks",
      weight: 3,
      target: "Price: 300-3000 USDC",
    },
    {
      name: "Time: <1 Month",
      weight: 4,
      target: "Price: 400-4000 USDC",
    },
  ],
  profitLabels: [
    {
      name: "Profit: <10%",
      weight: 1,
      target: "Price: 100-400 USDC",
    },
    {
      name: "Profit: <50%",
      weight: 5,
      target: "Price: 500-2000 USDC",
    },
    {
      name: "Profit: <100%",
      weight: 10,
      target: "Price: 1000-4000 USDC",
    },
    {
      name: "Profit: 100%+",
      weight: 20,
      target: "Price: 2000-8000 USDC",
    },
  ],
};
