import { Context, Payload } from "../../../types";
import { askGPT, sysMsg } from "../../../helpers/gpt";
import axios from "axios";
import OpenAI from "openai";
import { ChatCompletion, ChatCompletionMessageParam, CreateChatCompletionRequestMessage } from "openai/resources/chat";
import Runtime from "../../../bindings/bot-runtime";
import { generateConfiguration } from "../../../utils/generate-configuration";

const gptFunctions: OpenAI.Chat.Completions.ChatCompletionCreateParams.Function[] = [
  {
    name: "generateConfiguration",
    description: "Generate a new configuration for the bot",
    parameters: {
      type: "object",
      properties: {},
      require: [""],
    },
  },
];

const botSchemaString = `
Below is the configuration structure:
const BotConfigSchema = StrictObject(
    {
      keys: StrictObject({
        evmPrivateEncrypted: T.Optional(T.String()),
        openAi: T.Optional(T.String()),
      }),
      features: StrictObject({
        assistivePricing: T.Boolean({ default: false }),
        defaultLabels: T.Array(T.String(), { default: [] }),
        newContributorGreeting: StrictObject({
          enabled: T.Boolean({ default: false }),
          header: T.String({ default: defaultGreetingHeader }),
          displayHelpMenu: T.Boolean({ default: true }),
          footer: T.String({ default: promotionComment }),
        }),
        publicAccessControl: StrictObject({
          setLabel: T.Boolean({ default: true }),
          fundExternalClosedIssue: T.Boolean({ default: true }),
        }),
      }),
  
      timers: StrictObject({
        reviewDelayTolerance: stringDuration({ default: "1 day" }),
        taskStaleTimeoutDuration: stringDuration({ default: "4 weeks" }),
        taskFollowUpDuration: stringDuration({ default: "0.5 weeks" }),
        taskDisqualifyDuration: stringDuration({ default: "1 week" }),
      }),
      payments: StrictObject({
        maxPermitPrice: T.Number({ default: Number.MAX_SAFE_INTEGER }),
        evmNetworkId: T.Number({ default: 1 }),
        basePriceMultiplier: T.Number({ default: 1 }),
        issueCreatorMultiplier: T.Number({ default: 1 }),
      }),
      disabledCommands: T.Array(T.String(), { default: allCommands }),
      incentives: StrictObject({
        comment: StrictObject({
          elements: T.Record(T.Union(HtmlEntities), T.Number({ default: 0 }), { default: allHtmlElementsSetToZero }),
          totals: StrictObject({
            character: T.Number({ default: 0, minimum: 0 }),
            word: T.Number({ default: 0, minimum: 0 }),
            sentence: T.Number({ default: 0, minimum: 0 }),
            paragraph: T.Number({ default: 0, minimum: 0 }),
            comment: T.Number({ default: 0, minimum: 0 }),
          }),
        }),
      }),
      labels: StrictObject({
        time: T.Array(T.String(), { default: defaultTimeLabels }),
        priority: T.Array(T.String(), { default: defaultPriorityLabels }),
      }),
      miscellaneous: StrictObject({
        maxConcurrentTasks: T.Number({ default: Number.MAX_SAFE_INTEGER }),
        promotionComment: T.String({ default: promotionComment }),
        registerWalletWithVerification: T.Boolean({ default: false }),
        openAiTokenLimit: T.Number({ default: 100000 }),
      }),
    },
  );
`;
const deductionPrompt = `${"escapeMsg"}\n
You are an AI designed to process natural language and apply that to config generation efforts.
You are to use your best reasoning to determine from the admin's input what the configuration should ultimately be.
You will then create a new configuration default config file and inject the specific admin defined properties.
As all properties are optional, you should only inject the properties that are defined by the admin.

${botSchemaString}
`;

const helpPrompt = `
You are an AI designed to process natural language and apply that to config generation efforts, your role specifically is to provide the 'help' command for these efforts.
The 'help' command is used to detail and explain how to use the actual command '/config' which is used to generate the bot configuration.
The actual command processes whatever NL input is provided and generates a new configuration file with the properties defined by the admin.

You are to create a markdown table that lists all available config options and their types.

${botSchemaString}
`;

export async function singleResponse(
  context: Context,
  chatHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const config = context.config;
  const { keys, miscellaneous } = config;

  if (!keys.openAi) {
    throw logger.error(
      "You must configure the `openai-api-key` property in the bot configuration in order to use AI powered features."
    );
  }

  const openAI = new OpenAI({
    apiKey: keys.openAi,
  });

  const res = await openAI.chat.completions.create({
    messages: chatHistory,
    model: "gpt-3.5-turbo-16k-0613",
    max_tokens: 6000,
    temperature: 0,
    // functions: gptFunctions,
    // function_call: "auto",
  });

  const response = res.choices[0].message;
  const tokens = res.usage;

  const finalRes = `
${response.content}

<hr/>

\`\`\`yaml
${JSON.stringify(tokens)}
\`\`\`
  `;

  return finalRes;
}
/**
 * @param body The config settings to change
 */
export const setConfigWithNLP = async (context: Context, body: string) => {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const payload = context.event.payload as Payload;
  const sender = payload.sender.login;

  const isAdmin = await context.event.octokit.orgs.getMembershipForUser({
    org: payload.organization?.login || payload.repository.owner.login,
    username: sender,
  });

  if (!isAdmin.data.role || !isAdmin.data.state) {
    throw logger.error("You must be an admin to use this command.", { isAdmin }, true);
  }

  const regConHelp = /^\/(config|help|--help)\s?(.*)$/;
  const regCon = /^\/config\s(.+)$/;
  const chatHistory: ChatCompletionMessageParam[] = [];
  let response = "";

  if (body.match(regConHelp)) {
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
    const res = await singleResponse(context, chatHistory);
    response = res;
  } else if (body.match(regCon)) {
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

    const res = await singleResponse(context, chatHistory);

    response = res;
  } else {
    throw logger.error("Invalid command.", { body }, true);
  }

  return response;
};
