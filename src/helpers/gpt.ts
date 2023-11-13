import Runtime from "../bindings/bot-runtime";
import { Context, Payload, StreamlinedComment, UserType } from "../types";
import { getAllIssueComments, getAllLinkedIssuesAndPullsInBody } from "../helpers";
import OpenAI from "openai";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";

export const sysMsg = `You are the UbiquiBot, designed to provide accurate technical answers. \n
Whenever appropriate, format your response using GitHub Flavored Markdown. Utilize tables, lists, and code blocks for clear and organized answers. \n
Do not make up answers. If you are unsure, say so. \n
Original Context exists only to provide you with additional information to the current question, use it to formulate answers. \n
Infer the context of the question from the Original Context using your best judgement. \n
All replies MUST end with "\n\n <!--- { 'UbiquiBot': 'answer' } ---> ".\n
`;

// export const gptContextTemplate = `
// You are the UbiquiBot, designed to review and analyze pull requests.
// You have been provided with the spec of the issue and all linked issues or pull requests.
// Using this full context, Reply in pure JSON format, with the following structure omitting irrelevant information pertaining to the specification.
// You MUST provide the following structure, but you may add additional information if you deem it relevant.
// Example:[
//   {
//     "source": "issue #123"
//     "spec": "This is the issue spec"
//     "relevant": [
//       {
//         "login": "user",
//         "body": "This is the relevant context"
//         "relevancy": "Why is this relevant to the spec?"
//       },
//       {
//         "login": "other_user",
//         "body": "This is other relevant context"
//         "relevancy": "Why is this relevant to the spec?"
//       }
//     ]
//   },
//   {
//     "source": "Pull #456"
//     "spec": "This is the pull request spec"
//     "relevant": [
//       {
//         "login": "user",
//         "body": "This is the relevant context"
//         "relevancy": "Why is this relevant to the spec?"
//       },
//       {
//         "login": "other_user",
//         "body": "This is other relevant context"
//         "relevancy": "Why is this relevant to the spec?"
//       }
//     ]
//   }
// ]
// `;

// best used alongside getAllLinkedIssuesAndPullsInBody() in helpers/issue
export async function decideContextGPT(
  context: Context,
  chatHistory: CreateChatCompletionRequestMessage[],
  streamlined: StreamlinedComment[],
  linkedPRStreamlined: StreamlinedComment[],
  linkedIssueStreamlined: StreamlinedComment[]
) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;

  const payload = context.event.payload as Payload;
  const issue = payload.issue;

  if (!issue) {
    return `Payload issue is undefined`;
  }

  // standard comments
  const comments = await getAllIssueComments(context, issue.number);
  // raw so we can grab the <!--- { 'UbiquiBot': 'answer' } ---> tag
  const commentsRaw = await getAllIssueComments(context, issue.number, "raw");

  if (!comments) {
    logger.info(`Error getting issue comments`);
    return `Error getting issue comments`;
  }

  // add the first comment of the issue/pull request
  streamlined.push({
    login: issue.user.login,
    body: issue.body,
  });

  // add the rest
  comments.forEach(async (comment, i) => {
    if (comment.user.type == UserType.User || commentsRaw[i].body.includes("<!--- { 'UbiquiBot': 'answer' } --->")) {
      streamlined.push({
        login: comment.user.login,
        body: comment.body,
      });
    }
  });

  // returns the conversational context from all linked issues and prs
  const links = await getAllLinkedIssuesAndPullsInBody(context, issue.number);

  if (typeof links === "string") {
    return logger.info("Error getting linked issues or prs: ", { links });
  }

  linkedIssueStreamlined = links.linkedIssues;
  linkedPRStreamlined = links.linkedPrs;

  chatHistory.push(
    {
      role: "system",
      content: "This issue/Pr context: \n" + JSON.stringify(streamlined),
      name: "UbiquiBot",
    } as CreateChatCompletionRequestMessage,
    {
      role: "system",
      content: "Linked issue(s) context: \n" + JSON.stringify(linkedIssueStreamlined),
      name: "UbiquiBot",
    } as CreateChatCompletionRequestMessage,
    {
      role: "system",
      content: "Linked Pr(s) context: \n" + JSON.stringify(linkedPRStreamlined),
      name: "UbiquiBot",
    } as CreateChatCompletionRequestMessage
  );

  // we'll use the first response to determine the context of future calls
  const res = await askGPT(context, chatHistory);

  return res;
}

export async function askGPT(context: Context, chatHistory: CreateChatCompletionRequestMessage[]) {
  // base askGPT function
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const config = context.config;
  const { keys } = config;

  if (!keys.openAi) {
    throw logger.error(
      "You must configure the `openai-api-key` property in the bot configuration in order to use AI powered features."
    );
  }

  const openAI = new OpenAI({
    apiKey: keys.openAi,
  });

  const res: OpenAI.Chat.Completions.ChatCompletion = await openAI.chat.completions.create({
    messages: chatHistory,
    model: "gpt-3.5-turbo-16k",
    max_tokens: config.openai.tokenLimit,
    temperature: 0,
  });

  const answer = res.choices[0].message.content;

  const tokenUsage = {
    output: res.usage?.completion_tokens,
    input: res.usage?.prompt_tokens,
    total: res.usage?.total_tokens,
  };

  if (!res) {
    throw logger.error("Error getting GPT response", { res });
  }

  return { answer, tokenUsage };
}
