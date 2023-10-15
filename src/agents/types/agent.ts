import { CommandsHandler, CallbackHandler, PreActionHandler, ActionHandler, PostActionHandler } from "../../types";

interface Agent {
  uuid: string; // ID's are unique to each running instance of the agent
  name: string; // Name is the name of the agent
  description: string; // Description is a short description of the agent
  userCommands: UserCommands[]; // UserCommands is a list of commands that the user has given to the agent
  handlers: Handler; // Handlers is a set of handlers to do a pre/main/post action for a given action
  agentCommands: AgentCommands[]; // AgentCommands is a list of commands that the agent has onto itself
  tools: Tool[]; // Tools is a list of tools that the agent has onto itself
}

interface Tool {
  name: string; // Name is the name of the tool
  description: string; // Description is a short description of the tool
  handler: CommandsHandler; // Handler is the handler for the tool
}

interface AgentCommands {
  id: string; // ID is the ID of the command
  description: string; // Description is a short description of the command
  handler: CommandsHandler; // Handler is the handler for the command
}

interface UserCommands {
  id: number; // ID is the ID of the command
  description: string; // Description is a short description of the command
  handler: CommandsHandler; // Handler is the handler for the command
  callback: CallbackHandler; // Callback is the callback for the command
  successComment?: string; // SuccessComment is the comment to be displayed when the command is successful
  failureComment?: string; // FailureComment is the comment to be displayed when the command is unsuccessful
}

interface Handler {
  pre: PreActionHandler[];
  action: ActionHandler[];
  post: PostActionHandler[];
}

export { Agent, Tool, AgentCommands, UserCommands, Handler };
