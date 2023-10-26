import Decimal from "decimal.js";
import { validHTMLElements } from "./valid-html-elements";

export class ElementScoreConfig {
  public element: keyof HTMLElementTagNameMap;
  public value: Decimal;
  public disabled: boolean;

  constructor({ element, value, ignored = false }: { element: string; value: Decimal; ignored?: boolean }) {
    if (!this._isHTMLElement(element)) {
      throw new Error(`Invalid HTML element: ${element}`);
    }
    this.element = element;
    this.value = value;
    this.disabled = ignored;
  }

  private _isHTMLElement(element: string): element is keyof HTMLElementTagNameMap {
    return validHTMLElements.includes(element as keyof HTMLElementTagNameMap);
  }
}
