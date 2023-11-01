import Decimal from "decimal.js";
import { Contribution, ReviewReward } from "./view-role-contribution-enums";
import { DevPoolContributorReward } from "./base";

class _ReviewReward extends DevPoolContributorReward {
  configuration: {
    multiplier: Decimal;
  };
  rewards: {
    [Contribution.APPROVAL]: ReviewReward[];
    [Contribution.REJECTION]: ReviewReward[];
  };
}

export interface ReviewReward {
  overview: {
    reward: Decimal;
  };
  source: PullRequestReview;
}
