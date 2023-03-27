import { ParseMode } from "telegraf/types";

/**
 * @type {Object} MessagePayload
 * @property {chatIds} - chatId array ([10001,10002])
 * @property {action} - action name (`new issue` | `new pull request`)
 * @property {title} - message title (`feat: support for x`)
 * @property {description} - message description (`build: change x for y`)
 * @property {id} - issue | pull id (`54`)
 * @property {ref} - base url (`https://github.com/x/issues|pull/54`)
 * @property {user} - username (`x-user`)
 */
export type TLMessagePayload = {
  chatIds: string[];
  action: string;
  title: string;
  description: string;
  id: string;
  ref: string;
  user: string;
};

/**
 * @type {Object} FormattedMessagePayload
 * @property {chatIds} - chatId array ([10001,10002])
 * @property {text} - formatted text (`new issue: support for x`)
 * @property {parseMode} - parseMode (`HTML|Markdown|MarkdownV2`)
 */
export type TLMessageFormattedPayload = {
  chatIds: string[];
  text: string;
  parseMode: ParseMode;
};

/**
 * @type {Object} PhotoPayload
 * @property {chatId} - chatId  (`10001`)
 * @property {file} - relative file path (`./assets/file.png`)
 * @property {caption} - text caption (`opened issues: 10`)
 */
export type TLPhotoPayload = {
  chatId: string;
  file: string;
  caption: string;
};
