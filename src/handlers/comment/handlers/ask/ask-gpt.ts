import OpenAI from "openai";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";
import { getAllIssueComments } from "../../../../helpers/issue";
import { Context } from "../../../../types/context";
import { StreamlinedComment } from "../../../../types/openai";
import { GitHubPayload, UserType } from "../../../../types/payload";
import { getIssueByNumber, getPullByNumber } from "../../../assign/check-pull-requests";

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
  const logger = context.logger;

  const payload = context.event.payload as GitHubPayload;
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
  const logger = context.logger;
  const config = context.config;
  const { keys } = config;

  if (!keys.openAi) {
    throw logger.fatal(
      "You must configure the `openai-api-key` property in the bot configuration in order to use AI powered features."
    );
  }

  const openAI = new OpenAI({
    apiKey: keys.openAi,
  });

  const res: OpenAI.Chat.Completions.ChatCompletion = await openAI.chat.completions.create({
    messages: chatHistory,
    model: "gpt-3.5-turbo-16k",
    max_tokens: config.miscellaneous.openAiTokenLimit,
    temperature: 0,
  });

  const answer = res.choices[0].message.content;

  const tokenUsage = {
    output: res.usage?.completion_tokens,
    input: res.usage?.prompt_tokens,
    total: res.usage?.total_tokens,
  };

  if (!res) {
    throw context.logger.fatal("Error getting GPT response", { res });
  }

  return { answer, tokenUsage };
}

// Strips out all links from the body of an issue or pull request and fetches the conversational context from each linked issue or pull request
export async function getAllLinkedIssuesAndPullsInBody(context: Context, issueNumber: number) {
  const logger = context.logger;

  const issue = await getIssueByNumber(context, issueNumber);

  if (!issue) {
    throw logger.fatal("No issue found!", { issueNumber });
  }

  if (!issue.body) {
    throw logger.fatal("No body found!", { issueNumber });
  }

  const body = issue.body;
  const linkedPRStreamlined: StreamlinedComment[] = [];
  const linkedIssueStreamlined: StreamlinedComment[] = [];

  const regex = /https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(issues|pull)\/(\d+)/gi;
  const matches = body.match(regex);

  if (matches) {
    const linkedIssues: number[] = [];
    const linkedPrs: number[] = [];

    // this finds refs via all patterns: #<issue number>, full url or [#25](url.to.issue)
    const issueRef = issue.body.match(/(#(\d+)|https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(issues|pull)\/(\d+))/gi);

    // if they exist, strip out the # or the url and push them to their arrays
    if (issueRef) {
      issueRef.forEach((issue) => {
        if (issue.includes("#")) {
          linkedIssues.push(Number(issue.slice(1)));
        } else {
          if (issue.split("/")[5] == "pull") {
            linkedPrs.push(Number(issue.split("/")[6]));
          } else linkedIssues.push(Number(issue.split("/")[6]));
        }
      });
    } else {
      logger.info(`No linked issues or prs found`);
    }

    if (linkedPrs.length > 0) {
      for (let i = 0; i < linkedPrs.length; i++) {
        const pr = await getPullByNumber(context, linkedPrs[i]);
        if (pr) {
          linkedPRStreamlined.push({
            login: "system",
            body: `=============== Pull Request #${pr.number}: ${pr.title} + ===============\n ${pr.body}}`,
          });
          const prComments = await getAllIssueComments(context, linkedPrs[i]);
          const prCommentsRaw = await getAllIssueComments(context, linkedPrs[i], "raw");
          prComments.forEach(async (comment, i) => {
            if (
              comment.user.type == UserType.User ||
              prCommentsRaw[i].body.includes("<!--- { 'UbiquiBot': 'answer' } --->")
            ) {
              linkedPRStreamlined.push({
                login: comment.user.login,
                body: comment.body,
              });
            }
          });
        }
      }
    }

    if (linkedIssues.length > 0) {
      for (let i = 0; i < linkedIssues.length; i++) {
        const issue = await getIssueByNumber(context, linkedIssues[i]);
        if (issue) {
          linkedIssueStreamlined.push({
            login: "system",
            body: `=============== Issue #${issue.number}: ${issue.title} + ===============\n ${issue.body} `,
          });
          const issueComments = await getAllIssueComments(context, linkedIssues[i]);
          const issueCommentsRaw = await getAllIssueComments(context, linkedIssues[i], "raw");
          issueComments.forEach(async (comment, i) => {
            if (
              comment.user.type == UserType.User ||
              issueCommentsRaw[i].body.includes("<!--- { 'UbiquiBot': 'answer' } --->")
            ) {
              linkedIssueStreamlined.push({
                login: comment.user.login,
                body: comment.body,
              });
            }
          });
        }
      }
    }

    return {
      linkedIssues: linkedIssueStreamlined,
      linkedPrs: linkedPRStreamlined,
    };
  } else {
    logger.info(`No matches found`);
    return {
      linkedIssues: [],
      linkedPrs: [],
    };
  }
}
