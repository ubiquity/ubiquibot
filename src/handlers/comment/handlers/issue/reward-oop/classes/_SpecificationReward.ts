import Decimal from "decimal.js";
import { Contribution, CommentReward } from "./view-role-contribution-enums";
import { DevPoolContributorReward } from "./base";

class _SpecificationReward extends DevPoolContributorReward {
  configuration: {
    multiplier: Decimal;
  };
  rewards: {
    [Contribution.SPECIFICATION]: CommentReward;
  };
}
