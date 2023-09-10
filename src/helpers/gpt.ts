import { getBotConfig, getBotContext, getLogger } from "../bindings";
import { Payload, StreamlinedComment, UserType } from "../types";
import { getAllIssueComments, getAllLinkedIssuesAndPullsInBody } from "../helpers";
import OpenAI from "openai";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";
import { ErrorDiff } from "../utils/helpers";

export const sysMsg = `You are an AI designed to provide accurate technical answers. \n
Whenever appropriate, format your response using GitHub Flavored Markdown. Utilize tables, lists, and code blocks for clear and organized answers. \n
Do not make up answers. If you are unsure, say so. \n
Original Context exists only to provide you with additional information to the current question, use it to formulate answers. \n
Infer the context of the question from the Original Context using your best judgement. \n
All replies MUST end with "\n\n <!--- { 'OpenAI': 'answer' } ---> ".\n
`;

export const ratingExample = `
## Rating
| Spec Match | Description |
| --- | --- |
| 100% | Why this rating... Wonderful Effort (S) |
| 50% | Why this rating... Terrible effort (F) |
`;

export const issueSpecExample = `
# Issue Spec
| Linked Context | Context | Relevancy |
| --- | --- | --- |
| Issue # | This is the issue spec | Why is this relevant? |
| Pull # | This is the pull spec | Why is this relevant? |

- [x] {item}
- [ ] {item}
`;

export const implementationAnalysisExample = `
## Implementation Analysis
- [x] {item}
- [ ] {item}
`;

export const overallAnalysisExample = `
## Overall Analysis
- [x] {item}
- [ ] {item}
`;

export const specCheckTemplate = `
  You are an AI designed to analyze pull requests in comparison to the issue specification.\n
  You are to update the report after you review everything, pr diff, spec, and provided context.\n
  Measure the implementation against the issue spec and provide an overall analysis.\n
  You must NOT return any example text, only your comprehensive report. \n
  You MUST provide the following structure, but you may add additional information if you deem it relevant.\n

  Boilerplate: \n
  ${issueSpecExample}

  ${implementationAnalysisExample}

  ${overallAnalysisExample}

  ${ratingExample}
  `;

export const speckCheckResponse = `
The issue spec is provided in the context, and the pr diff is provided in the first response.

Finalize the report by proofreading the report for any errors.
Ensure only relevant context is provided in the spec and implementation analysis.
You MUST provide the following structure, but you may add additional information if you deem it relevant.
Do not include leftover boilerplate text, only your comprehensive report, this is crucial!

Boilerplate: \n
${issueSpecExample}

${implementationAnalysisExample}

${overallAnalysisExample}

${ratingExample}

All replies MUST end with "\n<!--- { 'OpenAI': 'specCheck' } --->".
`;

export const gptContextTemplate = `
You are an AI designed to review and analyze pull requests.
You have been provided with the spec of the issue and all linked issues or pull requests.
Using this full context, Reply in pure JSON format, with the following structure omitting irrelvant information pertaining to the specification.
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
      content: "This issue/Pr context: \n" + JSON.stringify(streamlined),
    } as CreateChatCompletionRequestMessage,
    {
      role: "system",
      content: "Linked issue(s) context: \n" + JSON.stringify(linkedIssueStreamlined),
    } as CreateChatCompletionRequestMessage,
    {
      role: "system",
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

  const openAI = new OpenAI({
    apiKey: config.review.apiKey,
  });

  const res: OpenAI.Chat.Completions.ChatCompletion = await openAI.chat.completions.create({
    messages: chatHistory,
    model: "gpt-3.5-turbo-16k",
    max_tokens: config.review.tokenLimit,
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
    return ErrorDiff(`No answer found for question: ${question}`);
  }

  return { answer, tokenUsage };
};
