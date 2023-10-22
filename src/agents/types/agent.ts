import { getBotConfig, getBotContext } from "../../bindings";
import { Payload } from "../../types";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";
import OpenAI from "openai";
import { ErrorDiff } from "../../utils/helpers";
import { registerUserWallet } from "../tools/agentTools";

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

  const agentCommands = [
    {
      name: "registerUserWallet",
      func: registerUserWallet,
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
      console.log(`Function: ${func.name}`);
      console.log(`Function params: ${funcParams}`);
      let argObj: { [x: string]: any };
      if (funcParams) {
        argObj = JSON.parse(funcParams);
      } else {
        argObj = {};
      }
      const argKeys = Object.keys(argObj);
      console.log(`Function arguments: ${argKeys}`);
      const args = argKeys.map((key) => argObj[key]);
      console.log(`Function arguments: ${args}`);
      const result = await func.func(...args);
      console.log(`Function result: ${result}`);

      chatHistory.push({
        role: "function",
        name: funcName,
        content: `# ${funcName} executed\n - data: ${result}`,
      } as CreateChatCompletionRequestMessage);

      response = await singleResponse(chatHistory);

      funcName = response.choices[0].message.function_call?.name;
      funcParams = response.choices[0].message.function_call?.arguments;
    }

    finalResponse = response.choices[0].message.content || `No response found.`;

    return finalResponse;
  }

  const response = await singleResponse(chatHistory);
  return await handleResponse(response);
}
