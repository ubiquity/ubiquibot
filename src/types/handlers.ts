// import { Comment } from "./payload";
import { LogReturn } from "../adapters/supabase/helpers/tables/logs";

export type HandlerReturnValuesNoVoid = string | LogReturn;
// type HandlerReturnValuesWithVoid= void | HandlerReturnValuesNoVoid;

export type ActionHandler = (args?: string) => Promise<HandlerReturnValuesNoVoid>;
type CommandsHandler = (args: string) => Promise<HandlerReturnValuesNoVoid>;

export type PreActionHandler = (args?: string) => Promise<void>;
export type PostActionHandler = (args?: string) => Promise<void>;

export type WildCardHandler = (args?: string) => Promise<void>;
// type CallbackHandler= (
//   issueNumber: number,
//   text: HandlerReturnValuesNoVoid,
//   action: string,
//   replyTo?: Comment
// ) => Promise<void>;

/**
 * @dev A set of handlers to do a pre/main/post action for a given action
 * @param pre - An array of pre-action handlers, it consists of a small piece of handlers.
 *  If pre action isn't needed, you can just leave it empty
 * @param action - An array of auction handlers, it consists of a small piece of handlers
 * @param post - An array of post action handlers, it consists of a small piece of handlers
 */
export type Handler = {
  pre: PreActionHandler[];
  action: ActionHandler[];
  post: PostActionHandler[];
};

export type UserCommands = {
  id: string;
  description: string;
  example: string;
  handler: CommandsHandler;
  // callback: CallbackHandler;
  // successComment?: string;
  // failureComment?: string;
};
