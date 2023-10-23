// TODO: should be inherited from default config. This is a temporary solution.
import Decimal from "decimal.js";
import { IssueRole } from "./archive/calculate-score-typings";
import MarkdownIt from "markdown-it";
import { ElementScoreConfig } from "./element-score-config";
import _ from "lodash";

const md = new MarkdownIt();
const ONE = new Decimal(1);
export class ScoringRubric {
  public category: IssueRole;
  private _wordValue: Decimal = new Decimal(0.1);
  private _wordScore: { [id: number]: { [word: string]: Decimal } } = {};
  private _wordMultiplier: Decimal = ONE;
  private _totalScores: { [id: number]: Decimal } = {};
  private _elementScoresPerId: { [id: number]: { [key: string]: { count: number; score: Decimal } } } = {};
  private _configElementScores: { [key: string]: { value: Decimal } } = {
    h1: new ElementScoreConfig("h1", ONE),
    h2: new ElementScoreConfig("h2", ONE),
    h3: new ElementScoreConfig("h3", ONE),
    h4: new ElementScoreConfig("h4", ONE),
    h5: new ElementScoreConfig("h5", ONE),
    h6: new ElementScoreConfig("h6", ONE),
    a: new ElementScoreConfig("a", ONE),
    ul: new ElementScoreConfig("ul", ONE),
    li: new ElementScoreConfig("li", ONE),
    p: new ElementScoreConfig("p", ONE),
    img: new ElementScoreConfig("img", ONE),
    code: new ElementScoreConfig("code", ONE),
    table: new ElementScoreConfig("table", ONE),
    td: new ElementScoreConfig("td", ONE),
    tr: new ElementScoreConfig("tr", ONE),
    br: new ElementScoreConfig("br", ONE),
    blockquote: new ElementScoreConfig("blockquote", ONE),
    em: new ElementScoreConfig("em", ONE),
    strong: new ElementScoreConfig("strong", ONE),
    hr: new ElementScoreConfig("hr", ONE),
    del: new ElementScoreConfig("del", ONE),
    pre: new ElementScoreConfig("pre", ONE),
    ol: new ElementScoreConfig("ol", ONE),
  };

  constructor(multiplier = 1, category: IssueRole) {
    this.category = category;
    this._applyMultiplier(multiplier);
  }

  private _parseComment(comment: string, id: number) {
    const htmlString = md.render(comment);
    if (!this._elementScoresPerId[id]) {
      this._elementScoresPerId[id] = _.mapValues(_.cloneDeep(this._configElementScores), () => ({
        count: 0,
        score: new Decimal(0),
      }));
    }
    for (const incomingTag in this._elementScoresPerId[id]) {
      const tag = this._elementScoresPerId[id][incomingTag];
      tag.count = this._countTags(htmlString, incomingTag);
      tag.score = this._configElementScores[incomingTag].value.times(tag.count);
    }
    return htmlString;
  }

  private _countTags(html: string, tag: string) {
    const regex = new RegExp(`<${tag}[^>]*>`, "g");
    return (html.match(regex) || []).length;
  }

  public compileTotalScorePerId(): void {
    for (const id in this._elementScoresPerId) {
      const totalElementScore = Object.values(this._elementScoresPerId[id]).reduce(
        (total, { score }) => total.plus(score),
        new Decimal(0)
      );
      const totalWordScore = Object.values(this._wordScore[id]).reduce(
        (total, count) => total.plus(count),
        new Decimal(0)
      );
      this._totalScores[id] = totalElementScore.plus(totalWordScore);
    }
  }

  public getTotalScore(id: number): Decimal {
    const score = this._totalScores[id];
    if (!score) {
      throw new Error(`No score for id ${id}`);
    }
    return score;
  }
  public wordCounter(comment: string, id: number) {
    const words = comment.match(/\w+/g) || [];
    if (!this._wordScore[id]) {
      this._wordScore[id] = {};
    }
    for (const word of words) {
      let counter = this._wordScore[id][word] || new Decimal(0);
      counter = counter.plus(this._wordValue);
      this._wordScore[id][word] = counter;
    }
    return this._wordScore[id];
  }

  public elementScore(comment: string, id: number) {
    return this._parseComment(comment, id);
  }

  private _applyMultiplier(multiplier = 1) {
    for (const id in this._configElementScores) {
      const selection = this._configElementScores[id];
      selection.value = selection.value.times(multiplier);
    }

    this._wordMultiplier = this._wordMultiplier.times(multiplier);
  }
}
