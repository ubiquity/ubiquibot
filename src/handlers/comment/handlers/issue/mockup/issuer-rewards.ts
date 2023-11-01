import Decimal from "decimal.js";
import { View, Role, Contribution } from "../reward-oop/classes/view-role-contribution-enums";

export interface PermitComment {
  role: Role;
  username: string;
  payment: {
    amount: Decimal;
    tokenAddress: string;
    tokenSymbol: string;
  };
  details: {
    overview: DetailsOverview[];
    comments: {
      commentBody: string;
      commentUrl: string;
      formattingScore: Decimal;
      formattingDetails: DetailsCommentsFormatting[];
      relevance: Decimal;
      reward: Decimal;
    }[];
  };
}

interface DetailsOverview {
  view: View;
  contribution: Contribution;
  count: number;
  reward: Decimal;
}

interface DetailsCommentsFormatting {
  tagName: string;
  count: number;
  score: Decimal;
  words: number;
}
