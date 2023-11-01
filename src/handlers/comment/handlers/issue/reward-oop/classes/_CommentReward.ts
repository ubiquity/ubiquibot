import Decimal from "decimal.js";
import { Contribution } from "./view-role-contribution-enums";
import { DevPoolContributorReward } from "./base";

class _CommentReward extends DevPoolContributorReward {
  configuration: {
    formatting: FormattingConfiguration;
    multiplier: Decimal;
    wordCount: WordCountConfiguration;
  };
  rewards: {
    [Contribution.COMMENT]: CommentReward[];
  };
}

interface CommentReward {
  overview: {
    formatting: Decimal;
    relevance: Decimal;
    reward: Decimal;
  };
  details: {
    wordCount: { [word: string]: Decimal } | null;
    formatting: { [element: string]: { count: number; score: Decimal; words: number } } | null;
    // ...
  };
  source: Comment;
}
