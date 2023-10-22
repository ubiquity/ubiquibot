import { getBotConfig, getBotContext } from "../../bindings";
import { Payload } from "../../types";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";
import OpenAI from "openai";
import { ErrorDiff } from "../../utils/helpers";
import { calculatePriorityAndDuration, registerUserWallet, setPriorityAndDuration } from "../tools/agentTools";
import { assign } from "../tools/agentTools";
import { overseerMsg } from "../utils/prompts";

const githubAgentFunctions: OpenAI.Chat.Completions.ChatCompletionCreateParams.Function[] = [
  {
    name: "registerUserWallet",
    description: "Register a user's ethereum wallet for payouts",
    parameters: {
      type: "object",
      properties: {
        walletAddress: {
          type: "string",
          description: "A valid ethereum wallet address",
        },
        ensName: {
          type: "string",
          description: "A valid ens name",
        },
      },
      require: ["walletAddress", "ensName"],
    },
  },
  {
    name: "assignToIssue",
    description: "Assign a user to an issue",
    parameters: {
      type: "object",
      properties: {
        issueNumber: {
          type: "number",
          description: "The issue number to assign to",
        },
        username: {
          type: "string",
          description: "The username to assign",
        },
      },
      require: ["issueNumber", "username"],
    },
  },
  {
    name: "setPriorityAndDuration",
    description: "Set the priority and duration labels of an issue so it can be priced and assigned.",
    parameters: {
      type: "object",
      properties: {
        issueNumber: {
          type: "number",
          description: "The issue number to set the priority and duration for",
        },
        priority: {
          type: "string",
          description:
            "The priority label to set: 'Priority: 1 (Normal)', 'Priority: 2 (Medium)', 'Priority: 3 (High)', 'Priority: 4 (Urgent)', 'Priority: 5 (Emergency)'",
        },
        duration: {
          type: "string",
          description: "The duration label to set 'Time: <1 hour', 'Time: <2 hours', 'Time: <4 hours', 'Time: <1 days', 'Time: <1 week'",
        },
      },
      require: ["issueNumber", "priority", "duration"],
    },
  },
  {
    name: "calculatePriorityAndDuration",
    description: "Calculate the priority and duration labels of an issue so it can be priced and assigned.",
    parameters: {
      type: "object",
      properties: {},
      require: [],
    },
  },
  {
    name: "updateRepoFile",
    description: "Update a file in a repo",
    parameters: {
      type: "object",
      properties: {
        repo: {
          type: "string",
          description: "The repo to update",
        },
        path: {
          type: "string",
          description: "The path to the file to update",
        },
        content: {
          type: "string",
          description: "The content to update the file with",
        },
      },
      require: ["repo", "path", "content"],
    },
  },
  {
    name: "unassignFromIssue",
    description: "Unassign a user from an issue",
    parameters: {
      type: "object",
      properties: {
        issueNumber: {
          type: "number",
          description: "The issue number to unassign from",
        },
      },
      require: ["issueNumber"],
    },
  },
  {
    name: "setUserMultiplier",
    description: "Set a user's bounty multiplier",
    parameters: {
      type: "object",
      properties: {
        username: {
          type: "string",
          description: "The username to set the multiplier for",
        },
        multiplier: {
          type: "number",
          description: "The multiplier to set",
        },
      },
      require: ["username", "multiplier"],
    },
  },
  {
    name: "collectStaleIssues",
    description: "Return a list of issues for a given repo that are stale",
    parameters: {
      type: "object",
      properties: {
        repo: {
          type: "string",
          description: "The repo to collect stale issues from",
        },
      },
    },
  },
  {
    name: "collectStalePullRequests",
    description: "Return a list of pull requests for a given repo that are stale",
    parameters: {
      type: "object",
      properties: {
        repo: {
          type: "string",
          description: "The repo to collect stale pull requests from",
        },
      },
    },
  },
  {
    name: "flushStaleIssue",
    description: "Closes a stale issue only with a valid and verified reason",
    parameters: {
      type: "object",
      properties: {
        issueNumber: {
          type: "number",
          description: "The issue number to close",
        },
        reason: {
          type: "string",
          description: "The reason to close the issue",
        },
      },
      require: ["issueNumber", "reason"],
    },
  },
  {
    name: "flushStalePullRequest",
    description: "Closes a stale pull request only with a valid and verified reason",
    parameters: {
      type: "object",
      properties: {
        pullRequestNumber: {
          type: "number",
          description: "The pull request number to close",
        },
        reason: {
          type: "string",
          description: "The reason to close the pull request",
        },
      },
      require: ["pullRequestNumber", "reason"],
    },
  },
  {
    name: "askForUserInput",
    description: "Allows you to pass in a question and get a response from the end user",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The question that you need to ask the current operator",
        },
      },
      require: ["question"],
    },
  },
];

export async function ubqGitHubAgent(body: string, chatHistory: CreateChatCompletionRequestMessage[]) {
  if (!body) return `Please ask a question`;
  if (!chatHistory) return `Please provide chat history`;

  const context = getBotContext();
  const config = getBotConfig();
  const payload = context.payload as Payload;
  const issue = payload.issue;

  if (!issue) return `This command can only be used on issues`;

  interface AgentCommand {
    name: string;
    func: (...args: any[]) => Promise<any>;
    expectedArgs: string[];
  }

  const agentCommands: AgentCommand[] = [
    {
      name: "registerUserWallet",
      func: registerUserWallet,
      expectedArgs: ["walletAddress", "ensName"],
    },
    {
      name: "assignToIssue",
      func: assign,
      expectedArgs: ["issueNumber", "username"],
    },
    {
      name: "calculatePriorityAndDuration",
      func: calculatePriorityAndDuration,
      expectedArgs: ["chatHistory"],
    },
    {
      name: "setPriorityAndDuration",
      func: setPriorityAndDuration,
      expectedArgs: ["issueNumber", "priority", "duration"],
    },
    // {
    //   name: "assignToIssue",

    // }
    // "registerUserWallet",
    // "assignToIssue",
    // "unassignFromIssue",
    // "setUserMultiplier",
    // "collectStaleIssues",
    // "collectStalePullRequests",
    // "flushStaleIssue",
    // "flushStalePullRequest",
    // "askForUserInput",
  ];

  const openAI = new OpenAI({
    apiKey: config.ask.apiKey,
  });

  const oversightChatHistory = [
    {
      role: "system",
      content: overseerMsg,
    } as CreateChatCompletionRequestMessage,
    {
      role: "user",
      content: body,
    } as CreateChatCompletionRequestMessage,
  ];

  async function singleResponse(chatHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[]) {
    return await openAI.chat.completions.create({
      messages: chatHistory,
      model: "gpt-3.5-turbo-16k-0613",
      max_tokens: config.ask.tokenLimit,
      temperature: 0,
      functions: githubAgentFunctions,
      function_call: "auto",
    });
  }

  async function handleResponse(response: OpenAI.Chat.Completions.ChatCompletion) {
    let chainCount = 0;
    let finalResponse = "";
    let funcName = response.choices[0].message.function_call?.name;
    let funcParams = response.choices[0].message.function_call?.arguments;

    while (funcName) {
      chainCount++;
      console.log(`Chain count: ${chainCount}`);
      console.log(`Response ${chainCount}: ${response.choices[0].message.content}`);
      const func = agentCommands.find((command) => command.name === funcName);
      if (!func) return ErrorDiff(`Agent command not found.`);

      let argObj: { [x: string]: any };
      if (funcParams) {
        argObj = JSON.parse(funcParams);
      } else {
        argObj = {};
      }

      const args = func.expectedArgs.map((argName) => argObj[argName] ?? chatHistory);

      let result;
      try {
        result = await func.func(...args);
      } catch (err) {
        console.log("====================================");
        console.log("err:", err);
        console.log("====================================");
        return ErrorDiff(`Error calling function: ${func.name}`);
      }

      chatHistory.push(
        {
          role: "function",
          name: funcName,
          content: `# ${funcName} executed\n - data: ${result}`,
        } as CreateChatCompletionRequestMessage,
        {
          role: "system",
          content: `As the function has been executed, the agent will now continue to the next step. That means executing the next function in the chain, or returning the final response.`,
        } as CreateChatCompletionRequestMessage
      );

      response = await singleResponse(chatHistory);

      console.log("====================================");
      console.log("singleResponse:", response.choices[0].message.content);
      console.log("====================================");

      funcName = response.choices[0].message.function_call?.name;
      funcParams = response.choices[0].message.function_call?.arguments;
    }

    finalResponse = response.choices[0].message.content || `No response found.`;

    return finalResponse;
  }

  const response = await singleResponse(chatHistory);

  oversightChatHistory.push({
    role: "assistant",
    content: `UbiquityBot:\n` + response.choices[0].message.content,
  } as CreateChatCompletionRequestMessage);

  const oversightResponse = await singleResponse(oversightChatHistory);

  console.log("===========oversight===========");
  console.log(oversightResponse.choices[0].message.content);
  console.log("====================================");

  oversightChatHistory.push({
    role: "assistant",
    content: `Overseer:\n` + oversightResponse.choices[0].message.content,
  } as CreateChatCompletionRequestMessage);

  chatHistory.push({
    role: "assistant",
    content: `Overseer:\n` + oversightResponse.choices[0].message.content,
  } as CreateChatCompletionRequestMessage);

  return await handleResponse(response);
}
