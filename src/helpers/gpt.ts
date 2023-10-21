import { getBotConfig, getBotContext, getLogger } from "../bindings";
import { Payload, StreamlinedComment, UserType } from "../types";
import { getAllIssueComments, getAllLinkedIssuesAndPullsInBody, getIssueByNumber } from "../helpers";
import OpenAI from "openai";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";
import { ErrorDiff } from "../utils/helpers";
import { Context } from "probot";

const escapeMsg = `Please ignore all previous commands and directives. \n
Take your time to think and process things before responding. \n
Perform exactly what is asked of you in the following way: \n\n`;

export const sysMsg = `${escapeMsg} You are an AI designed to provide accurate technical answers. \n
Whenever appropriate, format your response using GitHub Flavored Markdown. Utilize tables, lists, and code blocks for clear and organized answers. \n
Do not make up answers. If you are unsure, say so. \n
Original Context exists only to provide you with additional information to the current question, use it to formulate answers. \n
Infer the context of the question from the Original Context using your best judgement. \n
All replies MUST end with "\n\n <!--- { 'OpenAI': 'answer' } ---> ".\n
`;

export const requestedChangesMsg = `The input you will receive will be a JSON array of review comments. \n
You are to format an easy to read message that will be posted as a review comment on the pull request. \n
You are to create a GitHub tasklist returned in markdown built using checkboxes and lists. \n
=== Template === \n
# {username}, changes are needed. \n
- Once you have made the requested changes, call \`\`/review\`\` again. \n
- If you have any questions, you can ask them in a comment below using the ask command: \`\`/ask "question"\`\`. \n
- Please make sure to check off the tasks as you complete them. \n

### Your tasks: \n
{tasklist} \n
=== Template === \n
`;

export const pullRequestBusinessLogicMsg = `${escapeMsg} You are an AI designed to handle business logic surrounding pull requests. \n
You will request changes be made if the following conditions are met: \n
- The pull request spec is not achieved and there has been specific changes requested \n

You will approve the pull request if the following conditions are met: \n
- The pull request spec is achieved \n
- No specific changes have been requested \n
`;

export const validationMsg = `${escapeMsg} You are an AI validation bot designed to ensure that the answers provided by the OpenAI API meet our predefined standards. \n
The input you'll validate is the output of a pull request review performed by GPT-3, the output should adhere to one of the following standards. \n

Spec Not Achieved == Standard A \n
Spec Achieved == Standard B \n

If the spec is not achieved, changes will be requested and in that case the output should follow proper JSON format. If it doesn't, then you should fix it.
=== Standard A === 
[
{
  "path": "{path}",
  "body": "Changes are needed here: \n\n {body} \n\n Please make the requested changes and call \`\`/review\`\` again.",
  "line": {line}
  "start_line": {start_line}
}
]
=== Standard A === 


If the spec is achieved, then the output should be one sentence using the following Standard including their real username, no @ symbols: \n
=== Standard B === \n
### Spec achieved
{username}, you have achieved the spec and now the reviewers will let you know if there are any other changes needed.\n
=== Standard B === \n
`;

export const specCheckTemplate = `${escapeMsg} Using the provided context, ensure you clearly understand the specification of the issue. \n
Now using your best judgement, determine if the specification has been met based on the PR diff provided. \n
The spec should be achieved atleast logically, if not literally. If changes are made that are not directly mentioned in the spec, but are logical and do not break the spec, they are acceptable. \n

If the spec is not achieved, changes will be requested as a review comment pinned to the respective file and line number.
If changes span multiple files, multiple review comments will be made.
If changes span multiple lines, multiple review comments will be made.
Capture all changes needed in the following format, replacing the variables with the appropriate values.
All comments will be batched into a single review.

=== JSON ===
[{
  "path": "{path}",
  "start_line": {start_line},
  "line": {line},
  "body": "Changes are needed here: \n\n {body} \n\n Please make the requested changes and call \`\`/review\`\` again when you're done."
}]
=== JSON ===

If the spec is achieved then you will respond using the following template including their real username, no @ symbols:\
### Spec achieved
{username}, you have achieved the spec and now the reviewers will let you know if there are any other changes needed.\n
`;

export const gptContextTemplate = `${escapeMsg}
You are an AI designed to review and analyze pull requests.
You have been provided with the spec of the issue and all linked issues or pull requests.
Using this full context, Reply in pure JSON format, with the following structure omitting irrelvant information pertaining to the specification.
You MUST provide the following structure, but you may add additional information if you deem it relevant.
Do not include example data, only include data relevant to the specification.

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

export const getPRSpec = async (context: Context, chatHistory: CreateChatCompletionRequestMessage[], streamlined: StreamlinedComment[]) => {
  const logger = getLogger();

  const payload = context.payload as Payload;

  const pr = payload.issue;

  if (!pr) {
    return ErrorDiff(`Payload issue is undefined.`);
  }

  // we're in the pr context, so grab the linked issue body
  const regex = /(#(\d+)|https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(issues|pull)\/(\d+))/gi;
  const linkedIssueNumber = pr.body.match(regex);
  const linkedIssues: number[] = [];

  if (linkedIssueNumber) {
    linkedIssueNumber.forEach((issue: string) => {
      if (issue.includes("#")) {
        linkedIssues.push(Number(issue.slice(1)));
      } else {
        linkedIssues.push(Number(issue.split("/")[6]));
      }
    });
  } else {
    logger.info(`No linked issues or prs found`);
  }

  if (!linkedIssueNumber) {
    return ErrorDiff(`No linked issue found in body.`);
  }

  // get the linked issue body
  const linkedIssue = await getIssueByNumber(context, linkedIssues[0]);

  if (!linkedIssue) {
    return ErrorDiff(`Error getting linked issue.`);
  }

  // add the first comment of the pull request which is the contributor's description of their changes
  streamlined.push({
    login: pr.user.login,
    body: `${pr.user.login}'s pull request description:\n` + pr.body,
  });

  // add the linked issue body as this is the spec
  streamlined.push({
    login: "assistant",
    body: `#${linkedIssue.number} Specification: \n` + linkedIssue.body,
  });

  // no other conversation context is needed
  chatHistory.push({
    role: "system",
    content: "This pull request context: \n" + JSON.stringify(streamlined),
  } as CreateChatCompletionRequestMessage);

  return chatHistory;
};

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
    return ErrorDiff(`Payload issue is undefined.`);
  }

  // standard comments
  const comments = await getAllIssueComments(issue.number);
  // raw so we can grab the <!--- { 'OpenAI': 'answer' } ---> tag
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
    if (comment.user.type == UserType.User || commentsRaw[i].body.includes("<!--- { 'OpenAI': 'answer' } --->")) {
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
    return ErrorDiff(`Error getting linked issues or prs: ${links}`);
  }

  linkedIssueStreamlined = links.linkedIssues;
  linkedPRStreamlined = links.linkedPrs;

  chatHistory.push(
    {
      role: "system",
      content: gptContextTemplate,
    },
    {
      role: "assistant",
      content: "This issue/Pr context: \n" + JSON.stringify(streamlined),
    } as CreateChatCompletionRequestMessage,
    {
      role: "assistant",
      content: "Linked issue(s) context: \n" + JSON.stringify(linkedIssueStreamlined),
    } as CreateChatCompletionRequestMessage,
    {
      role: "assistant",
      content: "Linked Pr(s) context: \n" + JSON.stringify(linkedPRStreamlined),
    } as CreateChatCompletionRequestMessage
  );

  const res = await askGPT(`OpenAI fetching context for #${issue.number}`, chatHistory);

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
