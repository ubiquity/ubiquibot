import { JSDOM } from "jsdom";
// TODO: should be inherited from default config. This is a temporary solution.
import Decimal from "decimal.js";
import _ from "lodash";
import MarkdownIt from "markdown-it";
import { Comment } from "../../../../types/payload";
import { ContributorClassesKeys } from "./contribution-style-types";
import { FormatScoreConfig, FormatScoreConfigParams } from "./element-score-config";
import { Context } from "../../../../types/context";

export type Tags = keyof HTMLElementTagNameMap;

const md = new MarkdownIt();
const ZERO = new Decimal(0);
const ONE = new Decimal(1);

type CommentScoringConstructor = {
  contributionClass: ContributorClassesKeys;
  formattingMultiplier: number;
  wordValue: number;
};

export class CommentScoring {
  public contributionClass: ContributorClassesKeys; // This instance is used to calculate the score for this contribution `[view][role] "Comment"` class
  // public viewWordScore: Decimal; // TODO: implement
  // public viewWordScoreMultiplier!: number; // TODO: implement
  public roleWordScore: Decimal;
  public roleWordScoreMultiplier!: number;
  public commentScores: {
    [userId: string]: {
      totalScoreTotal: Decimal;
      wordScoreTotal: Decimal;
      formatScoreTotal: Decimal;
      details: {
        [commentId: string]: {
          totalScoreComment: Decimal;

          relevanceScoreComment: Decimal; // nullable because this is handled elsewhere in the program logic
          // clarityScoreComment: null | Decimal; // TODO: implement
          wordScoreComment: Decimal;
          wordScoreCommentDetails: { [word: string]: Decimal };
          formatScoreComment: Decimal;
          formatScoreCommentDetails: {
            [tagName in Tags]?: {
              count: number;
              score: Decimal;
              words: number;
            };
          };
          comment: Comment;
        };
      };
    };
  } = {};

  private _formatConfig: { [tagName in Tags]?: FormatScoreConfigParams } = {
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

  private _renderCache: { [commentId: number]: string } = {};

  constructor({ contributionClass, formattingMultiplier = 1, wordValue = 0 }: CommentScoringConstructor) {
    this.contributionClass = contributionClass;
    this._applyRoleMultiplier(formattingMultiplier);
    this.roleWordScore = new Decimal(wordValue);
  }

  private _getRenderedCommentBody(comment: Comment): string {
    if (!this._renderCache[comment.id]) {
      this._renderCache[comment.id] = md.render(comment.body);
    }
    return this._renderCache[comment.id];
  }

  public compileTotalUserScores(): void {
    for (const userId in this.commentScores) {
      const userCommentScore = this.commentScores[userId];
      const wordScores = [];
      const formatScores = [];
      for (const commentId in userCommentScore.details) {
        const commentScoreDetails = userCommentScore.details[commentId];
        const formatScoreComment = commentScoreDetails.formatScoreComment;
        const wordScoreComment = commentScoreDetails.wordScoreComment;

        commentScoreDetails.totalScoreComment = formatScoreComment.plus(wordScoreComment);

        wordScores.push(wordScoreComment);
        formatScores.push(formatScoreComment);
      }
      userCommentScore.wordScoreTotal = wordScores.reduce((total, score) => total.plus(score), ZERO);
      userCommentScore.formatScoreTotal = formatScores.reduce((total, score) => total.plus(score), ZERO);
      userCommentScore.totalScoreTotal = userCommentScore.wordScoreTotal.plus(userCommentScore.formatScoreTotal);
    }
  }

  public getTotalScorePerId(userId: number): Decimal {
    const score = this.commentScores[userId].totalScoreTotal;
    if (!score) {
      throw new Error(`No score for id ${userId}`);
    }
    return score;
  }

  private _getWordsNotInDisabledElements(comment: Comment): string[] {
    const htmlString = this._getRenderedCommentBody(comment);
    const dom = new JSDOM(htmlString);
    const doc = dom.window.document;
    const disabledElements = Object.entries(this._formatConfig)
      .filter(([, config]) => config.disabled)
      .map(([elementName]) => elementName);

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

  private _calculateWordScores(
    words: string[]
  ): (typeof CommentScoring.prototype.commentScores)[number]["details"][number]["wordScoreCommentDetails"] {
    const wordScoreCommentDetails: { [key: string]: Decimal } = {};

    for (const word of words) {
      let counter = wordScoreCommentDetails[word] || ZERO;
      counter = counter.plus(this.roleWordScore);
      wordScoreCommentDetails[word] = counter;
    }

    return wordScoreCommentDetails;
  }

  private _calculateWordScoresTotals(
    wordScoreCommentDetails: (typeof CommentScoring.prototype.commentScores)[number]["details"][number]["wordScoreCommentDetails"]
  ): Decimal {
    let totalScore = ZERO;
    for (const score of Object.values(wordScoreCommentDetails)) {
      totalScore = totalScore.plus(score);
    }
    return totalScore;
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

  public computeElementScore(context: Context, comment: Comment, userId: number) {
    const htmlString = this._getRenderedCommentBody(comment);
    const formatStatistics = _.mapValues(_.cloneDeep(this._formatConfig), () => ({
      count: 0,
      score: ZERO,
      words: 0,
    }));

    let totalElementScore = ZERO;

    for (const _elementName in formatStatistics) {
      const elementName = _elementName as Tags;
      const tag = formatStatistics[elementName];
      if (!tag) continue;

      tag.count = this._countTags(htmlString, elementName);
      const value = this._formatConfig[elementName]?.value;
      if (value) tag.score = value.times(tag.count);

      tag.words = this._countWordsInTag(htmlString, elementName);
      if (tag.count !== 0 || !tag.score.isZero()) {
        totalElementScore = totalElementScore.plus(tag.score);
      } else {
        delete formatStatistics[elementName]; // Delete the element if count and score are both zero
      }
    }

    this._initialize(context, comment, userId);
    // Store the element score for the comment
    this.commentScores[userId].details[comment.id].formatScoreComment = totalElementScore;
    this.commentScores[userId].details[comment.id].formatScoreCommentDetails = formatStatistics;

    return htmlString;
  }

  private _initialize(context: Context, comment: Comment, userId: number) {
    if (!this.commentScores[userId]) {
      context.logger.debug("good thing we initialized, was unsure if necessary");
      const initialCommentScoreValue = {
        totalScoreTotal: ZERO,
        wordScoreTotal: ZERO,
        formatScoreTotal: ZERO,
        details: {},
      };
      this.commentScores[userId] = { ...initialCommentScoreValue };
    }
    if (!this.commentScores[userId].details[comment.id]) {
      context.logger.debug("good thing we initialized, was unsure if necessary");
      this.commentScores[userId].details[comment.id] = {
        totalScoreComment: ZERO,
        relevanceScoreComment: ZERO,
        wordScoreComment: ZERO,
        formatScoreComment: ZERO,
        formatScoreCommentDetails: {},
        wordScoreCommentDetails: {},
        comment,
      };
    }
  }

  public computeWordScore(context: Context, comment: Comment, userId: number) {
    const words = this._getWordsNotInDisabledElements(comment);
    const wordScoreDetails = this._calculateWordScores(words);

    this._initialize(context, comment, userId);
    this.commentScores[userId].details[comment.id].comment = comment;
    this.commentScores[userId].details[comment.id].wordScoreComment = this._calculateWordScoresTotals(wordScoreDetails);
    this.commentScores[userId].details[comment.id].wordScoreCommentDetails = wordScoreDetails;

    return wordScoreDetails;
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
