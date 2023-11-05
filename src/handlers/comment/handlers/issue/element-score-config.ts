import Decimal from "decimal.js";
import { validHTMLElements } from "./valid-html-elements";
export interface FormatScoreConfigParams {
  element: string;
  value?: null | Decimal;
  disabled?: boolean;
}
export class FormatScoreConfig {
  public element: keyof HTMLElementTagNameMap;
  public value: null | Decimal = null;
  public disabled: boolean;

  constructor({ element, value = null, disabled = false }: FormatScoreConfigParams) {
    if (!this._isHTMLElement(element)) {
      throw new Error(`Invalid HTML element: ${element}`);
    }
    this.element = element;
    this.disabled = disabled;
    this.value = value;
  }

  private _isHTMLElement(element: string): element is keyof HTMLElementTagNameMap {
    return validHTMLElements.includes(element as keyof HTMLElementTagNameMap);
  }
}
