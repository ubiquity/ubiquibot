import { Context } from "../../../../types/context";
import { Issue } from "../../../../types/payload";
import { taskPaymentMetaData } from "../../../wildcard";
import { getUserMultiplier } from "./get-user-multiplier";

export async function getMultiplierInfoToDisplay(context: Context, senderId: number, repoId: number, issue: Issue) {
  const userMultiplier = await getUserMultiplier(senderId, repoId);
  const value = userMultiplier?.value || null;
  const reason = userMultiplier?.reason || null;

  let totalPriceOfTask: string | null = null;

  if (value && value != 1) {
    const task = taskPaymentMetaData(context, issue);

    if (task.priceLabel) {
      const price = parsePrice(task.priceLabel);
      price.number *= value;
      totalPriceOfTask = `${price.number} ${price.currency}`;
    } else {
      totalPriceOfTask = "Permit generation disabled because price label is not set.";
    }
  }

  return {
    multiplierAmount: value,
    multiplierReason: reason,
    totalPriceOfTask: totalPriceOfTask,
  };
}

function parsePrice(priceString: string) {
  const match = priceString.match(/Price: ([\d.]+) (\w+)/);
  if (!match) {
    throw new Error("Invalid price string");
  }

  const number = parseFloat(match[1]);
  const currency = match[3];

  return { number, currency };
}
