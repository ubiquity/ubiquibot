import { JSDOM } from "jsdom";
// TODO: should be inherited from default config. This is a temporary solution.
import Decimal from "decimal.js";
import MarkdownIt from "markdown-it";
import { ElementScoreConfig, ElementScoreConfigParams } from "./element-score-config";
import _ from "lodash";
import { Comment } from "../../../../types/payload";
import { ContributionStyles } from "./specification-scoring";

const md = new MarkdownIt();
// const NEG_ONE = new Decimal(-1);
const ZERO = new Decimal(0);
const ONE = new Decimal(1);

type ScoringRubricConstructor = {
  role: ContributionStyles;
  formattingMultiplier: number;
  wordValue: number;
};
export class CommentScoringRubric {
  public role: ContributionStyles;
  public roleWordScore: Decimal;
  public roleWordScoreMultiplier!: number;
  public userWordScoreTotals: { [userId: number]: Decimal } = {};
  public userElementScoreTotals: { [userId: number]: Decimal } = {};
  public userElementScoreDetails: {
    [userId: number]: { [commentId: string]: { count: number; score: Decimal; words: number } };
  } = {};
  public commentScores: {
    [userId: number]: {
      [commentId: number]: {
        wordScoreTotal: null | Decimal;
        wordScoreDetails: { [word: string]: Decimal };
        elementScoreTotal: null | Decimal;
        elementScoreDetails: { [key: string]: { count: number; score: Decimal; words: number } };
      };
    };
  } = {};

  private _elementConfig: { [key: string]: ElementScoreConfigParams } = {
    img: new ElementScoreConfig({ element: "img", disabled: true }), // disabled
    blockquote: new ElementScoreConfig({ element: "blockquote", disabled: true }), // disabled
    em: new ElementScoreConfig({ element: "em", disabled: true }), // disabled
    strong: new ElementScoreConfig({ element: "strong", disabled: true }), // disabled

    h1: new ElementScoreConfig({ element: "h1", value: ONE }),
    h2: new ElementScoreConfig({ element: "h2", value: ONE }),
    h3: new ElementScoreConfig({ element: "h3", value: ONE }),
    h4: new ElementScoreConfig({ element: "h4", value: ONE }),
    h5: new ElementScoreConfig({ element: "h5", value: ONE }),
    h6: new ElementScoreConfig({ element: "h6", value: ONE }),
    a: new ElementScoreConfig({ element: "a", value: ONE }),
    // ul: new ElementScoreConfig({ element: "ul", value: ONE }),
    li: new ElementScoreConfig({ element: "li", value: ONE }),
    // p: new ElementScoreConfig({ element: "p", value: ZERO }),
    code: new ElementScoreConfig({ element: "code", value: ONE }),
    // table: new ElementScoreConfig({ element: "table", value: ONE }),
    td: new ElementScoreConfig({ element: "td", value: ONE }),
    // tr: new ElementScoreConfig({ element: "tr", value: ONE }),
    br: new ElementScoreConfig({ element: "br", value: ONE }),
    hr: new ElementScoreConfig({ element: "hr", value: ONE }),
    // del: new ElementScoreConfig({ element: "del", value: ONE }),
    // pre: new ElementScoreConfig({ element: "pre", value: ONE }),
    // ol: new ElementScoreConfig({ element: "ol", value: ONE }),
  };

  constructor({ role, formattingMultiplier = 1, wordValue = 0 }: ScoringRubricConstructor) {
    this.role = role;
    this._applyRoleMultiplier(formattingMultiplier);
    this.roleWordScore = new Decimal(wordValue);
  }

  public compileUserScores(): void {
    for (const userId in this.userElementScoreDetails) {
      const userElementScore = this.userElementScoreDetails[userId];
      const userWordScoreDetails = this.userWordScoreTotals[userId];

      const totalElementScore = userElementScore
        ? Object.values(userElementScore).reduce((total, { score }) => total.plus(score), ZERO)
        : ZERO;

      const totalWordScore = userWordScoreDetails instanceof Decimal ? userWordScoreDetails : ZERO;

      this.userWordScoreTotals[userId] = new Decimal(totalElementScore).plus(new Decimal(totalWordScore));

      // Calculate total element score across all comments for the user
      this.userElementScoreTotals[userId] = Object.values(this.commentScores[userId] || {}).reduce(
        (total, { elementScoreDetails }) => {
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
    const disabledElements = Object.entries(this._elementConfig)
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
        wordScoreTotal: null,
        elementScoreTotal: null,
        wordScoreDetails: {},
        elementScoreDetails: {},
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
    const selectedUser = _.mapValues(_.cloneDeep(this._elementConfig), () => ({
      count: 0,
      score: ZERO,
      words: 0,
    }));

    let totalElementScore = ZERO;
    for (const incomingTag in selectedUser) {
      const tag = selectedUser[incomingTag];
      tag.count = this._countTags(htmlString, incomingTag);
      const value = this._elementConfig[incomingTag].value;
      if (value) {
        tag.score = value.times(tag.count);
      }
      tag.words = this._countWordsInTag(htmlString, incomingTag);
      if (tag.count !== 0 || !tag.score.isZero()) {
        totalElementScore = totalElementScore.plus(tag.score);
      } else {
        delete selectedUser[incomingTag]; // Delete the element if count and score are both zero
      }
    }

    if (!this.userElementScoreDetails[userId]) {
      this.userElementScoreDetails[userId] = {};
    }
    this.userElementScoreDetails[userId] = selectedUser;

    // Store the element score for the comment
    if (!this.commentScores[userId]) {
      this.commentScores[userId] = {};
    }
    if (!this.commentScores[userId][comment.id]) {
      this.commentScores[userId][comment.id] = {
        wordScoreTotal: null,
        elementScoreTotal: null,
        elementScoreDetails: {},
        wordScoreDetails: {},
      };
    }
    this.commentScores[userId][comment.id].elementScoreTotal = totalElementScore;
    this.commentScores[userId][comment.id].elementScoreDetails = selectedUser; // Change this line

    return htmlString;
  }

  private _applyRoleMultiplier(multiplier: number) {
    for (const userId in this._elementConfig) {
      const selection = this._elementConfig[userId];
      const value = selection.value;
      if (value) {
        selection.value = value.times(multiplier);
      }
    }

    this.roleWordScoreMultiplier = multiplier;
  }

  private _countTags(html: string, tag: string) {
    if (this._elementConfig[tag].disabled) {
      return 0;
    }

    const regex = new RegExp(`<${tag}[^>]*>`, "g");
    return (html.match(regex) || []).length;
  }
}
