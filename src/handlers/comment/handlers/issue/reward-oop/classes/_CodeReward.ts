import Decimal from "decimal.js";
import { Contribution, CommentReward } from "./view-role-contribution-enums";
import { DevPoolContributorReward } from "./base";

class _CodeReward extends DevPoolContributorReward {
  configuration: {
    multiplier: Decimal;
    lineCount: CodeLinesConfiguration;
  };
  rewards: {
    [Contribution.CODE]: CommentReward[];
  };
}
