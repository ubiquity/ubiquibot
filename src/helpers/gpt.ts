import { getBotConfig, getBotContext, getLogger } from "../bindings";
import { Payload, StreamlinedComment, UserType } from "../types";
import { getAllIssueComments, getAllLinkedIssuesAndPullsInBody } from "../helpers";
import OpenAI from "openai";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";
import { ErrorDiff } from "../utils/helpers";

export const sysMsg = `You are the UbiquiBot, designed to provide accurate technical answers. \n
Whenever appropriate, format your response using GitHub Flavored Markdown. Utilize tables, lists, and code blocks for clear and organized answers. \n
Do not make up answers. If you are unsure, say so. \n
Original Context exists only to provide you with additional information to the current question, use it to formulate answers. \n
Infer the context of the question from the Original Context using your best judgement. \n
All replies MUST end with "\n\n <!--- { 'UbiquiBot': 'answer' } ---> ".\n
`;

export const gptContextTemplate = `
You are the UbiquiBot, designed to review and analyze pull requests.
You have been provided with the spec of the issue and all linked issues or pull requests.
Using this full context, Reply in pure JSON format, with the following structure omitting irrelevant information pertaining to the specification.
You MUST provide the following structure, but you may add additional information if you deem it relevant.
Example:[
  {
    "source": "issue #123"
    "spec": "This is the issue spec"
    "relevant": [
      {
        "login": "user",
        "body": "This is the relevant context"
        "relevancy": "Why is this relevant to the spec?"
      },
      {
        "login": "other_user",
        "body": "This is other relevant context"
        "relevancy": "Why is this relevant to the spec?"
      }
    ]
  },
  {
    "source": "Pull #456"
    "spec": "This is the pull request spec"
    "relevant": [
      {
        "login": "user",
        "body": "This is the relevant context"
        "relevancy": "Why is this relevant to the spec?"
      },
      {
        "login": "other_user",
        "body": "This is other relevant context"
        "relevancy": "Why is this relevant to the spec?"
      }
    ]
  }
]
`;

/**
 * @notice best used alongside getAllLinkedIssuesAndPullsInBody() in helpers/issue
 * @param chatHistory the conversational context to provide to GPT
 * @param streamlined an array of comments in the form of { login: string, body: string }
 * @param linkedPRStreamlined an array of comments in the form of { login: string, body: string }
 * @param linkedIssueStreamlined an array of comments in the form of { login: string, body: string }
 */
export const decideContextGPT = async (
  chatHistory: CreateChatCompletionRequestMessage[],
  streamlined: StreamlinedComment[],
  linkedPRStreamlined: StreamlinedComment[],
  linkedIssueStreamlined: StreamlinedComment[]
) => {
  const context = getBotContext();
  const logger = getLogger();

  const payload = context.payload as Payload;
  const issue = payload.issue;

  if (!issue) {
    return `Payload issue is undefined`;
  }

  // standard comments
  const comments = await getAllIssueComments(issue.number);
  // raw so we can grab the <!--- { 'UbiquiBot': 'answer' } ---> tag
  const commentsRaw = await getAllIssueComments(issue.number, "raw");

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
  const links = await getAllLinkedIssuesAndPullsInBody(issue.number);

  if (typeof links === "string") {
    logger.info(`Error getting linked issues or prs: ${links}`);
    return `Error getting linked issues or prs: ${links}`;
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
  const res = await askGPT("", chatHistory);

  return res;
};

/**
 * @notice base askGPT function
 * @param question the question to ask
 * @param chatHistory the conversational context to provide to GPT
 */
export const askGPT = async (question: string, chatHistory: CreateChatCompletionRequestMessage[]) => {
  const logger = getLogger();
  const config = getBotConfig();

  if (!config.ask.apiKey) {
    logger.info(`No OpenAI API Key provided`);
    return ErrorDiff("You must configure the `openai-api-key` property in the bot configuration in order to use AI powered features.");
  }

  const openAI = new OpenAI({
    apiKey: config.ask.apiKey,
  });

  const res: OpenAI.Chat.Completions.ChatCompletion = await openAI.chat.completions.create({
    messages: chatHistory,
    model: "gpt-3.5-turbo-16k",
    max_tokens: config.ask.tokenLimit,
    temperature: 0,
  });

  const answer = res.choices[0].message.content;

  const tokenUsage = {
    output: res.usage?.completion_tokens,
    input: res.usage?.prompt_tokens,
    total: res.usage?.total_tokens,
  };

  if (!res) {
    logger.info(`No answer found for question: ${question}`);
    return `No answer found for question: ${question}`;
  }

  return { answer, tokenUsage };
};
