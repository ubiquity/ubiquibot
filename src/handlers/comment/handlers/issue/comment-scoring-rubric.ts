import { JSDOM } from "jsdom";
// TODO: should be inherited from default config. This is a temporary solution.
import Decimal from "decimal.js";
import MarkdownIt from "markdown-it";
import { FormatScoreConfig, FormatScoreConfigParams } from "./element-score-config";
import _ from "lodash";
import { Comment } from "../../../../types/payload";
import { ContributorClassNames } from "./specification-scoring";

export type Tags = keyof HTMLElementTagNameMap;

type FormatConfigMap = {
  [tagName in Tags]?: FormatScoreConfigParams;
};

export type FormatScoreDetails = {
  [tagName in Tags]?: {
    count: number;
    score: Decimal;
    words: number;
  };
};

const md = new MarkdownIt();
const ZERO = new Decimal(0);
const ONE = new Decimal(1);

type CommentScoringConstructor = {
  contributionClass: ContributorClassNames;
  formattingMultiplier: number;
  wordValue: number;
};
export class CommentScoring {
  public contributionClass: ContributorClassNames;
  public roleWordScore: Decimal;
  public roleWordScoreMultiplier!: number;
  public userWordScoreTotals: { [userId: number]: Decimal } = {};
  public userFormatScoreTotals: { [userId: number]: Decimal } = {};
  public userFormatScoreDetails: {
    [userId: number]: {
      [commentId: string]: {
        count: number;
        score: Decimal;
        words: number;
      };
    };
  } = {};
  public commentScores: {
    [userId: number]: {
      [commentId: number]: {
        wordScoreTotal: Decimal;
        wordScoreDetails: { [word: string]: Decimal };
        formatScoreTotal: Decimal;
        formatScoreDetails: FormatScoreDetails;
      };
    };
  } = {};

  private _formatConfig: FormatConfigMap = {
    img: new FormatScoreConfig({ element: "img", disabled: true }), // disabled
    blockquote: new FormatScoreConfig({ element: "blockquote", disabled: true }), // disabled
    em: new FormatScoreConfig({ element: "em", disabled: true }), // disabled
    strong: new FormatScoreConfig({ element: "strong", disabled: true }), // disabled

    h1: new FormatScoreConfig({ element: "h1", value: ONE }),
    h2: new FormatScoreConfig({ element: "h2", value: ONE }),
    h3: new FormatScoreConfig({ element: "h3", value: ONE }),
    h4: new FormatScoreConfig({ element: "h4", value: ONE }),
    h5: new FormatScoreConfig({ element: "h5", value: ONE }),
    h6: new FormatScoreConfig({ element: "h6", value: ONE }),
    a: new FormatScoreConfig({ element: "a", value: ONE }),
    // ul: new ElementScoreConfig({ element: "ul", value: ONE }),
    li: new FormatScoreConfig({ element: "li", value: ONE }),
    // p: new ElementScoreConfig({ element: "p", value: ZERO }),
    code: new FormatScoreConfig({ element: "code", value: ONE }),
    // table: new ElementScoreConfig({ element: "table", value: ONE }),
    td: new FormatScoreConfig({ element: "td", value: ONE }),
    // tr: new ElementScoreConfig({ element: "tr", value: ONE }),
    br: new FormatScoreConfig({ element: "br", value: ONE }),
    hr: new FormatScoreConfig({ element: "hr", value: ONE }),
    // del: new ElementScoreConfig({ element: "del", value: ONE }),
    // pre: new ElementScoreConfig({ element: "pre", value: ONE }),
    // ol: new ElementScoreConfig({ element: "ol", value: ONE }),
  };

  constructor({ contributionClass, formattingMultiplier = 1, wordValue = 0 }: CommentScoringConstructor) {
    this.contributionClass = contributionClass;
    this._applyRoleMultiplier(formattingMultiplier);
    this.roleWordScore = new Decimal(wordValue);
  }

  public compileUserScores(): void {
    for (const userId in this.userFormatScoreDetails) {
      const userElementScore = this.userFormatScoreDetails[userId];
      const userWordScoreDetails = this.userWordScoreTotals[userId];

      const totalElementScore = userElementScore
        ? Object.values(userElementScore).reduce((total, { score }) => total.plus(score), ZERO)
        : ZERO;

      const totalWordScore = userWordScoreDetails instanceof Decimal ? userWordScoreDetails : ZERO;

      this.userWordScoreTotals[userId] = new Decimal(totalElementScore).plus(new Decimal(totalWordScore));

      // Calculate total element score across all comments for the user
      this.userFormatScoreTotals[userId] = Object.values(this.commentScores[userId] || {}).reduce(
        (total, { formatScoreDetails: elementScoreDetails }) => {
          const elementScore = elementScoreDetails
            ? Object.values(elementScoreDetails).reduce((total, { score }) => total.plus(score), ZERO)
            : ZERO;
          return total.plus(elementScore);
        },
        ZERO
      );
    }
  }

  public getTotalScorePerId(userId: number): Decimal {
    const score = this.userWordScoreTotals[userId];
    if (!score) {
      throw new Error(`No score for id ${userId}`);
    }
    return score;
  }

  public computeWordScore(comment: Comment | { body: string; id: number }, userId: number) {
    const words = this._getWordsNotInDisabledElements(comment);
    const wordScoreDetails = this._calculateWordScores(words);
    const totalWordScore = this._calculateTotalScore(wordScoreDetails);

    this._storeCommentWordScore(userId, comment.id, totalWordScore, wordScoreDetails);

    return this.commentScores[userId][comment.id].wordScoreDetails;
  }

  private _getWordsNotInDisabledElements(comment: Comment | { body: string }): string[] {
    const htmlString = md.render(comment.body);
    const dom = new JSDOM(htmlString);
    const doc = dom.window.document;
    const disabledElements = Object.entries(this._formatConfig)
      .filter(([_, config]) => config.disabled)
      .map(([elementName, _]) => elementName);

    disabledElements.forEach((elementName) => {
      const elements = doc.getElementsByTagName(elementName);
      for (let i = 0; i < elements.length; i++) {
        this._removeTextContent(elements[i]); // Recursively remove text content
      }
    });

    // Provide a default value when textContent is null
    return (doc.body.textContent || "").match(/\w+/g) || [];
  }

  private _removeTextContent(element: Element): void {
    if (element.hasChildNodes()) {
      for (const child of Array.from(element.childNodes)) {
        this._removeTextContent(child as Element);
      }
    }
    element.textContent = ""; // Remove the text content of the element
  }

  private _calculateWordScores(words: string[]): { [key: string]: Decimal } {
    const wordScoreDetails: { [key: string]: Decimal } = {};

    for (const word of words) {
      let counter = wordScoreDetails[word] || ZERO;
      counter = counter.plus(this.roleWordScore);
      wordScoreDetails[word] = counter;
    }

    return wordScoreDetails;
  }

  private _calculateTotalScore(wordScoreDetails: { [key: string]: Decimal }): Decimal {
    return Object.values(wordScoreDetails).reduce((total: Decimal, count: Decimal) => total.plus(count), ZERO);
  }

  private _storeCommentWordScore(
    userId: number,
    commentId: number,
    totalWordScore: Decimal,
    wordScoreDetails: { [key: string]: Decimal }
  ): void {
    if (!this.commentScores[userId]) {
      this.commentScores[userId] = {};
    }
    if (!this.commentScores[userId][commentId]) {
      this.commentScores[userId][commentId] = {
        wordScoreTotal: ZERO,
        formatScoreTotal: ZERO,
        wordScoreDetails: {},
        formatScoreDetails: {},
      };
    }
    this.commentScores[userId][commentId].wordScoreTotal = totalWordScore;
    this.commentScores[userId][commentId].wordScoreDetails = wordScoreDetails;
  }
  private _countWordsInTag(html: string, tag: string): number {
    const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "g");
    let match;
    let wordCount = 0;
    while ((match = regex.exec(html)) !== null) {
      const content = match[1];
      const words = content.match(/\w+/g) || [];
      wordCount += words.length;
    }
    return wordCount;
  }

  public computeElementScore(comment: Comment, userId: number) {
    const htmlString = md.render(comment.body);
    const elementStatistics = _.mapValues(_.cloneDeep(this._formatConfig), () => ({
      count: 0,
      score: ZERO,
      words: 0,
    }));

    let totalElementScore = ZERO;

    for (const _elementName in elementStatistics) {
      const elementName = _elementName as Tags;
      const tag = elementStatistics[elementName];
      if (!tag) continue;

      tag.count = this._countTags(htmlString, elementName);
      const value = this._formatConfig[elementName]?.value;
      if (value) tag.score = value.times(tag.count);

      tag.words = this._countWordsInTag(htmlString, elementName);
      if (tag.count !== 0 || !tag.score.isZero()) {
        totalElementScore = totalElementScore.plus(tag.score);
      } else {
        delete elementStatistics[elementName]; // Delete the element if count and score are both zero
      }
    }

    this.userFormatScoreDetails[userId] = elementStatistics;

    // Store the element score for the comment
    if (!this.commentScores[userId]) {
      this.commentScores[userId] = {};
    }
    if (!this.commentScores[userId][comment.id]) {
      this.commentScores[userId][comment.id] = {
        wordScoreTotal: ZERO,
        formatScoreTotal: ZERO,
        formatScoreDetails: {},
        wordScoreDetails: {},
      };
    }
    this.commentScores[userId][comment.id].formatScoreTotal = totalElementScore;
    this.commentScores[userId][comment.id].formatScoreDetails = elementStatistics;

    return htmlString;
  }

  private _applyRoleMultiplier(multiplier: number) {
    for (const tag in this._formatConfig) {
      const selection = this._formatConfig[tag as Tags];
      const value = selection?.value;
      if (value) {
        selection.value = value.times(multiplier);
      }
    }
    this.roleWordScoreMultiplier = multiplier;
  }

  private _countTags(html: string, tag: Tags) {
    if (this._formatConfig[tag]?.disabled) {
      return 0;
    }

    const regex = new RegExp(`<${tag}[^>]*>`, "g");
    return (html.match(regex) || []).length;
  }
}
