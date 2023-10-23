import Decimal from "decimal.js";
import { IssueRole } from "./archive/calculate-score-typings";
import { validHTMLElements } from "./valid-html-elements";
// TODO: should be inherited from default config. This is a temporary solution.
import { unified } from "unified";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { parseComment } from "./remark-parse-comments";
const ONE = new Decimal(1);

export class ScoringRubric {
  constructor(multiplier = 1, category: IssueRole) {
    this.category = category;
    this._construction(multiplier);
  }
  public category: IssueRole;
  public ids: number[] = [];
  // private _elementsScore: typeof this._elements = {};
  private _totalsScore: typeof this._totals = {};

  public addUserId(id: number) {
    this.ids.push(id);
  }

  public wordScore(comment: string) {
    const words = comment.match(/\w+/g) || [];
    const score = new Decimal(0);
    for (const word of words) {
      const wordScore = this._totals[word] || 0;
      score.plus(wordScore);
    }
    this._totalsScore.words = score;
    return score;
  }

  public elementScore(comment: string) {
    parseComment.then((comment) => {
      const file = unified().use(remarkGfm).process(comment);
      console.log(file);
      this._totalsScore.elements = score;
    });
    return score;
  }

  private _construction(multiplier = 1) {
    for (const element in this._elements) {
      this._elements[element].score = this._elements[element].score.times(multiplier);
    }
    for (const total in this._totals) {
      this._totals[total] = this._totals[total].times(multiplier);
    }
  }
  private _elements: { [key: string]: ElementScore } = {
    h1: new ElementScore("h1", ONE),
    h2: new ElementScore("h2", ONE),
    h3: new ElementScore("h3", ONE),
    h4: new ElementScore("h4", ONE),
    h5: new ElementScore("h5", ONE),
    h6: new ElementScore("h6", ONE),
    a: new ElementScore("a", ONE),
    ul: new ElementScore("ul", ONE),
    li: new ElementScore("li", ONE),
    p: new ElementScore("p", ONE),
    img: new ElementScore("img", ONE),
    code: new ElementScore("code", ONE),
    table: new ElementScore("table", ONE),
    td: new ElementScore("td", ONE),
    tr: new ElementScore("tr", ONE),
    br: new ElementScore("br", ONE),
    blockquote: new ElementScore("blockquote", ONE),
    em: new ElementScore("em", ONE),
    strong: new ElementScore("strong", ONE),
    hr: new ElementScore("hr", ONE),
    del: new ElementScore("del", ONE),
    pre: new ElementScore("pre", ONE),
    ol: new ElementScore("ol", ONE),
  };
  private _totals: { [key: string]: Decimal } = { word: ONE };
}
class ElementScore {
  constructor(element: string, score: Decimal) {
    if (!isHTMLElement(element)) {
      throw new Error(`Invalid HTML element: ${element}`);
    }
    this.element = element;
    this.score = score;
    this.count = 0;
  }
  public element: keyof HTMLElementTagNameMap;
  public score: Decimal;
  public count: number;
}

function isHTMLElement(element: string): element is keyof HTMLElementTagNameMap {
  return validHTMLElements.includes(element as keyof HTMLElementTagNameMap);
}
