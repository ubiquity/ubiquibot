import { Context, Payload, validateBotConfig } from "../../../types";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat";
import Runtime from "../../../bindings/bot-runtime";
import { generateConfiguration } from "../../../utils/generate-configuration";
import { Context as ProbotContext } from "probot";

const gptFunctions: OpenAI.Chat.Completions.ChatCompletionCreateParams.Function[] = [
  {
    name: "generateDefaultConfig",
    description: "Generate a new configuration for the bot",
    parameters: {
      type: "object",
      properties: {
        configurations: {
          type: "object",
          description: "The configuration key value pairs needed to regenerate",
          properties: {
            key: {
              type: "string",
              description: "The configuration item key",
            },
            value: {
              type: "string",
              description: "The configuration item value",
            },
          },
          required: ["key", "value"],
        },
      },
      required: ["configurations"],
    },
  },
  {
    name: "validateConfig",
    description: "Validate the types of the new configuration",
    parameters: {
      type: "object",
      properties: {
        config: {
          type: "object",
          description: "The configuration object to validate",
          properties: {
            key: {
              type: "string",
              description: "The configuration item key",
            },
            value: {
              type: "string",
              description: "The configuration item value",
            },
          },
          require: ["key", "value"],
        },
      },
      require: ["config"],
    },
  },
  {
    name: "pushToRepo",
    description: "Push the new configuration to the repository",
    parameters: {
      type: "object",
      properties: {
        config: {
          type: "object",
          description: "The configuration object to validate",
          properties: {
            key: {
              type: "string",
              description: "The configuration item key",
            },
            value: {
              type: "string",
              description: "The configuration item value",
            },
          },
          require: ["key", "value"],
        },
      },
      require: ["config"],
    },
  },
];

const botSchemaString = `
interface BotConfig {
  keys: {
    evmPrivateEncrypted?: string;
    openAi?: string;
  };
  features: {
    assistivePricing: boolean;
    defaultLabels: string[];
    newContributorGreeting: {
      enabled: boolean;
      header: string;
      displayHelpMenu: boolean;
      footer: string;
    };
    publicAccessControl: {
      setLabel: boolean;
      fundExternalClosedIssue: boolean;
    };
  };
  timers: {
    reviewDelayTolerance: string;
    taskStaleTimeoutDuration: string;
    taskFollowUpDuration: string;
    taskDisqualifyDuration: string;
  };
  payments: {
    maxPermitPrice: number;
    evmNetworkId: number;
    basePriceMultiplier: number;
    issueCreatorMultiplier: number;
  };
  disabledCommands: string[];
  incentives: {
    comment: {
      elements: {
        [key in HtmlEntities]: number;
      };
      totals: {
        character: number;
        word: number;
        sentence: number;
        paragraph: number;
        comment: number;
      };
    };
  };
  labels: {
    time: string[];
    priority: string[];
  };
  miscellaneous: {
    maxConcurrentTasks: number;
    promotionComment: string;
    registerWalletWithVerification: boolean;
    openAiTokenLimit: number;
  };
}
`;

const basePrompt = `You are an AI designed to process natural language and apply that to config generation efforts.
You are to use your best reasoning to determine what the admin is asking for and respond accordingly.
You will be given a context object that contains the current configuration of the bot which you'll inject the inferred configuration into.
Ultimately, you will push the new and valid configuration to the repository.

# NOTE: Calling a function will carry on the chain of events, responding directly will end the chain so only respond directly when you are done. 
# NOTE: You must not retry more than 3 times, in this case you exit the chain and respond directly to the admin with the error message.
`;

const deductionPrompt = `${basePrompt} ## Deduction:
- You are to infer the configuration values from the admin's request.
- You are to replace ONLY those variables in the configuration object with the new values.
`;

const invalidPrompt = `## Invalid: \n
- The reasons for invalidation are above, You are required to manually resolve them BEFORE you call validateConfig again.
- Adding additional properties to the configuration object will fail validation, you are to replace ONLY the variables that have changed in the configuration object with the new values or when removing errors.
- Respond only by calling the validateConfig function again passing the new configuration object.
- If you cannot resolve them, you are to respond to the admin with the error message.

`;

function reconfigPromptF<T>(args: T) {
  return ` ## Reconfiguration: \n
- You are to replace ONLY the variables that have changed in the configuration object with the new values.
- You do this manually, there is no function to call.
- Once complete, respond only by calling the validateConfig function again passing the new configuration object.


## Injectables: \n
- ${JSON.stringify(args, null, 2)} \n
`;
}

const helpPrompt = `
You are an AI designed to process natural language and apply that to config generation efforts, your role specifically is to provide the 'help' command for these efforts.
The 'help' command is used to detail and explain how to use the actual command '/config' which is used to generate the bot configuration.
Under the hood the inferred configuration is injected into the default configuration and then committed to the repository by you.
Knowing this, there is no default syntax for the command, you are to use your best reasoning to determine what the admin is asking for and respond accordingly.

You are to create a markdown table that lists all available config options and their types.

${botSchemaString}
`;

/**
 *
 * @param context The full context object
 * @param probotContext The context of the probot
 * @param chatHistory The chat history to use for the response
 * @param temp The temperature to use for the response
 * @returns The response from the GPT-4 API
 */
export async function singleResponse(
  context: Context,
  probotContext: ProbotContext,
  chatHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  temp = 0
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const config = context.config;
  const { keys, miscellaneous } = config;

  // if (!keys.openAi) {
  //   throw logger.error(
  //     "You must configure the `openai-api-key` property in the bot configuration in order to use AI powered features."
  //   );
  // }

  const openAI = new OpenAI({
    apiKey: "",
  });

  const res = (await openAI.chat.completions.create({
    messages: chatHistory,
    model: "gpt-3.5-turbo-16k",
    temperature: temp,
    functions: gptFunctions,
    function_call: "auto",
  })) as OpenAI.Chat.Completions.ChatCompletion;

  const handled = await handleResponse(context, probotContext, res, chatHistory);

  return handled.choices[0].message.content ? handled : res;
}

export async function handleResponse(
  context: Context,
  probotContext: ProbotContext,
  res: OpenAI.Chat.Completions.ChatCompletion,
  chatHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
) {
  const repository = (context.event.payload as Payload).repository;
  const funcName = res.choices[0].message.function_call?.name || undefined;
  const funcArgs = res.choices[0].message.function_call?.arguments || undefined;
  console.log("FUNCARGS", funcArgs);
  console.log("Stop reason: ", res.choices[0].finish_reason);
  const argObj = funcArgs ? JSON.parse(funcArgs) : null;
  console.log("=========== Handling Response ===========");
  console.log("=========== Chain Iteration ===========");
  console.log(chatHistory);
  if (funcName) {
    switch (funcName) {
      case "generateDefaultConfig": {
        console.log("=========== Handling generateDefaultConfig ===========");
        const config = await generateConfiguration(probotContext);
        const reconfigPrompt = reconfigPromptF(argObj.configurations);
        chatHistory.push(
          {
            role: "function",
            name: funcName,
            content: JSON.stringify(config, null, 2),
          },
          {
            role: "system",
            content: reconfigPrompt,
          },
          {
            role: "user",
            content: `Update the new configuration object with the new values`,
          }
        );

        res = await singleResponse(context, probotContext, chatHistory);
        return res;
      }
      case "validateConfig": {
        console.log("=========== Handling validateConfig ===========");
        const validated = validateBotConfig(argObj.config);
        if (!validated) {
          chatHistory.push(
            {
              role: "function",
              name: funcName,
              content: JSON.stringify(validateBotConfig.errors, null, 2),
            },
            {
              role: "system",
              content: invalidPrompt,
            },
            {
              role: "user",
              content: `Identify the errors and resolve them. Call the validateConfig function again passing new valid config JSON object. DO NOT RESPOND WITHOUT CALLING THE FUNCTION.`,
            }
          );

          res = await singleResponse(context, probotContext, chatHistory);
          return res;
        } else {
          chatHistory.push(
            {
              role: "function",
              name: funcName,
              content: JSON.stringify(argObj.config, null, 2),
            },
            {
              role: "user",
              content: `The configuration is valid, call the pushToRepo function passing the new valid config JSON object.`,
            }
          );

          res = await singleResponse(context, probotContext, chatHistory);
          return res;
        }
      }
      case "pushToRepo": {
        console.log("=========== Handling pushToRepo ===========");

        const commitUrl = await pushConfigToRepo(context, argObj.config, repository);
        chatHistory.push(
          {
            role: "function",
            name: funcName,
            content: `- ${commitUrl}`,
          },
          {
            role: "user",
            content: `You are done, the bot will now use the new configuration. Return the new ref sha in a markdown list summarising the changes made to the admin.`,
          }
        );
        res = await singleResponse(context, probotContext, chatHistory);
        return res;
      }
      default:
        return res;
    }
  } else {
    return res;
  }
}

/**
 * @param body The config settings to change
 */
export const setConfigWithNLP = async (context: Context, body: string) => {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const payload = context.event.payload as Payload;
  const sender = payload.sender.login;

  let isAdmin: any;

  try {
    isAdmin = await context.event.octokit.orgs.getMembershipForUser({
      org: payload.organization?.login || payload.repository.owner.login,
      username: sender,
    });
  } catch (err: any) {
    throw logger.error(err.message, true);
  }

  if (isAdmin.data.role != "admin") {
    return logger.error("You must be an admin to use this command.", {}, true);
  }

  const regConHelp = /^\/config (help|--help)$/;
  const regCon = /^\/config\s(.+)$/;
  const chatHistory: ChatCompletionMessageParam[] = [];
  let response: string | null = null;

  if (body.match(regConHelp)) {
    // Psuedo help command
    chatHistory.push(
      {
        role: "system",
        content: helpPrompt,
      },
      {
        role: "user",
        content: `Explain to ${sender} the bot config structure and how to use the command.`,
      }
    );
    const res = await singleResponse(context, context.event, chatHistory);
    response = res.choices[0].message.content;
  } else if (body.match(regCon)) {
    // Actual config command
    chatHistory.push(
      {
        role: "system",
        content: deductionPrompt,
      },
      {
        role: "user",
        content: body,
      }
    );
    // Raising the temp as to not take the prompt too literally
    const res = await singleResponse(context, context.event, chatHistory, 0.3);
    response = res.choices[0].message.content;
  } else {
    throw logger.error("Invalid command.", { body }, true);
  }

  return response;
};

export async function pushConfigToRepo(
  context: Context,
  newConfig: Awaited<ReturnType<typeof generateConfiguration>>,
  repository: Payload["repository"]
) {
  console.log("=========== Pushing Config To Repo ===========");
  console.log("pushing config to repo...");
  console.log(newConfig);

  const allRepoCommits = await context.event.octokit.repos
    .listCommits({
      owner: repository.owner.login,
      repo: repository.name,
    })
    .then((res) => res.data);

  const currentCommit = allRepoCommits[0];
  const currentCommitSha = currentCommit.sha;

  const configPath = ".github/bot-config.json";
  const configContent = JSON.stringify(newConfig, null, 2);

  console.log("=========== Creating Blob ===========");
  console.log("creating blob...");
  console.log(configContent);
  console.log("=========== Creating Blob ===========");

  const configBlob = await context.event.octokit.git
    .createBlob({
      owner: repository.owner.login,
      repo: repository.name,
      content: configContent,
      encoding: "utf-8",
    })
    .then((res) => res.data);

  console.log("=========== Creating Tree ===========");
  console.log("creating tree...");
  console.log("=========== Creating Tree ===========");

  const newTree = await context.event.octokit.git
    .createTree({
      owner: repository.owner.login,
      repo: repository.name,
      base_tree: currentCommitSha,
      tree: [
        {
          path: configPath,
          mode: "100644",
          type: "blob",
          sha: configBlob.sha,
        },
      ],
    })
    .then((res) => res.data);

  console.log("=========== Creating Commit ===========");
  console.log("creating commit...");
  console.log("=========== Creating Commit ===========");

  const newCommit = await context.event.octokit.git
    .createCommit({
      owner: repository.owner.login,
      repo: repository.name,
      message: "Update bot config",
      tree: newTree.sha,
      parents: [currentCommitSha],
    })
    .then((res) => res.data);

  const newCommitSha = newCommit.sha;

  console.log("=========== Updating Ref ===========");
  console.log("updating ref...");
  console.log("=========== Updating Ref ===========");

  const newRef = await context.event.octokit.git
    .updateRef({
      owner: repository.owner.login,
      repo: repository.name,
      ref: `heads/${repository.default_branch}`,
      sha: newCommitSha,
    })
    .then((res) => res.data);

  const url = newRef.url;

  return url;
}
