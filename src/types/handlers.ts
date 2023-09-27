import { BotContext } from "./config";
import { Comment } from "./payload";

export type CommandsHandler = (context: BotContext, args: string) => Promise<string | undefined>;
export type ActionHandler = (context: BotContext,args?: string) => Promise<void>;
export type CallbackHandler = (context: BotContext,issue_number: number, text: string, action: string, reply_to?: Comment) => Promise<void>;
export type PreActionHandler = ActionHandler;
export type PostActionHandler = ActionHandler;

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
  handler: CommandsHandler;
  callback: CallbackHandler;
  successComment?: string;
  failureComment?: string;
};
