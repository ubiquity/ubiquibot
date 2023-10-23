import Decimal from "decimal.js";
import { validHTMLElements } from "./valid-html-elements";

export class ElementScoreConfig {
  public element: keyof HTMLElementTagNameMap;
  public value: Decimal;

  constructor(element: string, value: Decimal) {
    if (!this._isHTMLElement(element)) {
      throw new Error(`Invalid HTML element: ${element}`);
    }
    this.element = element;
    this.value = value;
  }

  private _isHTMLElement(element: string): element is keyof HTMLElementTagNameMap {
    return validHTMLElements.includes(element as keyof HTMLElementTagNameMap);
  }
}
