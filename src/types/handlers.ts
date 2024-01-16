import { LogReturn } from "ubiquibot-logger";
import { Context } from "./context";

export type HandlerReturnValuesNoVoid = null | string | LogReturn;

export type MainActionHandler = (context: Context) => Promise<HandlerReturnValuesNoVoid>;
type CommandsHandler = (context: Context, body: string) => Promise<HandlerReturnValuesNoVoid>;

export type PreActionHandler = (context: Context) => Promise<void>;
export type PostActionHandler = (context: Context) => Promise<void>;

export type WildCardHandler = (context: Context) => Promise<void>;

/**
 * @dev A set of handlers to do a pre/main/post action for a given action
 * @param pre - An array of pre-action handlers, it consists of a small piece of handlers.
 *  If pre action isn't needed, you can just leave it empty
 * @param action - An array of auction handlers, it consists of a small piece of handlers
 * @param post - An array of post action handlers, it consists of a small piece of handlers
 */
export type Handler = {
  pre: PreActionHandler[];
  action: MainActionHandler[];
  post: PostActionHandler[];
};

export type UserCommands = {
  id: string;
  description: string;
  example: string;
  handler: CommandsHandler;
};
