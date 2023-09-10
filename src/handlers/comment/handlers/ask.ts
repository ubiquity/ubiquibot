import { getBotConfig, getBotContext, getLogger } from "../../../bindings";
import { GPTResponse, Payload, StreamlinedComment, UserType } from "../../../types";
import { addCommentToIssue, getAllIssueComments, getAllLinkedIssuesAndPullsInBody, getPullByNumber } from "../../../helpers";
import OpenAI from "openai";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";

const sysMsg = `You are the UbiquityAI, designed to provide accurate technical answers. \n
Whenever appropriate, format your response using GitHub Flavored Markdown. Utilize tables, lists, and code blocks for clear and organized answers. \n
Do not make up answers. If you are unsure, say so. \n
Original Context exists only to provide you with additional information to the current question, use it to formulate answers. \n
Infer the context of the question from the Original Context using your best judgement. \n
All replies MUST end with "\n\n <!--- { 'UbiquityAI': 'answer' } ---> ".\n
`;

const ratingExample = `
## Rating
| Spec Match | Description |
| --- | --- |
| 100% | Why this rating... Wonderful Effort (S) |
| 50% | Why this rating... Terrible effort (F) |
`;

const issueSpecExample = `
# Issue Spec
| Linked Context | Context | Relevancy |
| --- | --- | --- |
| Issue # | This is the issue spec | Why is this relevant? |
| Pull # | This is the pull spec | Why is this relevant? |

- [x] This is a complete spec item
- [ ] This is an incomplete spec item
`;

const implementationAnalysisExample = `
## Implementation Analysis
- [x] This is a complete implementation item
- [ ] This is an incomplete implementation item
`;

const overallAnalysisExample = `
## Overall Analysis
- [x] This is a complete overall item
- [ ] This is an incomplete overall item
`;

const specCheckTemplate = `
  You are the UbiquityAI, designed to analyze pull requests in comparison to the issue specification.\n
  You are to update the report after you review everything, pr diff, spec, and provided context.\n
  Measure the implementation against the issue spec and provide an overall analysis.\n
  You must NOT return the any example text, only your comprehensive report. \n
  You MUST provide the following structure, but you may add additional information if you deem it relevant.\n

  Boilerplate: \n
  ${issueSpecExample}

  ${implementationAnalysisExample}

  ${overallAnalysisExample}

  ${ratingExample}
  `;

const speckCheckResponse = `
The issue spec is provided in the context, and the pr diff is provided in the first response.

Finalize the report by proofreading the report for any errors.
Ensure only relevant context is provided in the spec and implementation analysis.
Be sure to provide a rating for the implementation and an overall analysis.
Use the following template to provide your report, you MUST remove any unused boilerplate.

Boilerplate: \n
${issueSpecExample}

${implementationAnalysisExample}

${overallAnalysisExample}

${ratingExample}

All replies MUST end with "\n<!--- { 'UbiquityAI': 'specCheck' } --->".
`;

const gptContextTemplate = `
You are the UbiquityAI, designed to review and analyze pull requests.
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

// Adding to these will likely confuse the AI, it would be best to create a new template and a new chain

// In an attempt at token control, we'll allow chad to deduce what is the most relevant context
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
  // raw so we can grab the <!--- { 'UbiquityAI': 'answer' } ---> tag
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
    if (comment.user.type == UserType.User || commentsRaw[i].body.includes("<!--- { 'UbiquityAI': 'answer' } --->")) {
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
      name: "UbiquityAI",
    } as CreateChatCompletionRequestMessage,
    {
      role: "system",
      content: "Linked issue(s) context: \n" + JSON.stringify(linkedIssueStreamlined),
      name: "UbiquityAI",
    } as CreateChatCompletionRequestMessage,
    {
      role: "system",
      content: "Linked Pr(s) context: \n" + JSON.stringify(linkedPRStreamlined),
      name: "UbiquityAI",
    } as CreateChatCompletionRequestMessage
  );

  // we'll use the first response to determine the context of future calls
  const res = await askGPT("", chatHistory);

  return res;
};

/**
 * @notice Three calls to Chad are made. First for context, second for review and third for finalization.
 * @returns Pull Request Report
 */
export const prReviewGPT = async () => {
  const context = getBotContext();
  const logger = getLogger();

  const payload = context.payload as Payload;
  const issue = payload.issue;

  const streamlined: StreamlinedComment[] = [];
  let chatHistory: CreateChatCompletionRequestMessage[] = [];
  let linkedPRStreamlined: StreamlinedComment[] = [];
  let linkedIssueStreamlined: StreamlinedComment[] = [];

  if (!issue) {
    return `Payload issue is undefined`;
  }

  const comments = await getAllIssueComments(issue.number);
  const commentsRaw = await getAllIssueComments(issue.number, "raw");

  if (!commentsRaw) {
    logger.info(`Error getting issue comments`);
    return `Error getting issue comments`;
  }
  streamlined.push({
    login: issue.user.login,
    body: issue.body,
  });

  comments.forEach(async (comment, i) => {
    if (comment.user.type == UserType.User || commentsRaw[i].body.includes("<!--- { 'UbiquityAI': 'answer' } --->")) {
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

  // return a diff of the changes made in the PR
  const comparePR = async () => {
    const comparePR = await context.octokit.pulls.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: issue.number,
    });

    const pr = comparePR.data;

    const prDiff = await context.octokit.pulls.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: pr.number,
      mediaType: {
        format: "diff",
      },
    });

    const diffContent = prDiff.data;

    return {
      pr,
      diff: diffContent,
    };
  };

  const isPr = await getPullByNumber(context, issue.number);

  // if it's not a pr, return
  if (!isPr) {
    return `This command can only be used on PRs`;
  }

  const isPull = async () => {
    if (isPr) {
      const diff = await comparePR()
        .then(({ diff }) => {
          return diff;
        })
        .catch((error) => {
          logger.info(`Error getting diff: ${error}`);
          return `Error getting diff: ${error}`;
        });

      chatHistory.push({
        role: "system",
        content: gptContextTemplate,
        name: "UbiquityAI",
      } as CreateChatCompletionRequestMessage);

      // We're allowing Chad to deduce what is the most relevant context
      const gptDecidedContext = await decideContextGPT(chatHistory, streamlined, linkedPRStreamlined, linkedIssueStreamlined);

      if (typeof gptDecidedContext === "string") {
        return gptDecidedContext;
      }

      chatHistory = [];
      chatHistory.push(
        {
          role: "system",
          content: specCheckTemplate, // provide the spec check template
          name: "UbiquityAI",
        } as CreateChatCompletionRequestMessage,
        {
          role: "system",
          content: "Context: \n" + JSON.stringify(gptDecidedContext.answer), // provide the context
          name: "UbiquityAI",
        } as CreateChatCompletionRequestMessage,
        {
          role: "user",
          content: "PR Diff: \n" + JSON.stringify(diff), // provide the diff
          name: "user",
        } as CreateChatCompletionRequestMessage
      );

      const draftReport: GPTResponse | string = await askGPT("", chatHistory);
      let draftReportAnswer: string;

      if (typeof draftReport === "string") {
        return draftReport;
      } else {
        if (!draftReport.answer) {
          logger.info(`First Run Response Error`);
          return `First Run Response Error`;
        }
        draftReportAnswer = draftReport.answer;
      }

      chatHistory = [];
      chatHistory.push(
        {
          role: "system",
          content: speckCheckResponse, // provide the finalization template
          name: "UbiquityAI",
        } as CreateChatCompletionRequestMessage,
        {
          role: "system",
          content: "Spec: \n" + JSON.stringify(gptDecidedContext), // provide the context
          name: "UbiquityAI",
        } as CreateChatCompletionRequestMessage,
        {
          role: "assistant",
          content: "Draft report: \n" + draftReportAnswer, // provide the first analysis
          name: "assistant",
        } as CreateChatCompletionRequestMessage
      );

      const gptResponse: GPTResponse | string = await askGPT(draftReportAnswer, chatHistory);

      if (typeof gptResponse === "string") {
        return gptResponse;
      } else {
        if (gptResponse.answer) {
          return gptResponse.answer;
        } else {
          logger.info(`Error getting response from GPT`);
          return `Error getting response from GPT`;
        }
      }
    } else {
      return `No PR found for issue #${issue.number}`;
    }
  };

  const res = await isPull();
  await addCommentToIssue(res, issue.number);
  // add the pull request report to the issue
  return res;
};

export const askGPT = async (question: string, chatHistory: CreateChatCompletionRequestMessage[]) => {
  const logger = getLogger();
  const config = getBotConfig();

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

/**
 * @param body The question to ask
 */
export const ask = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();

  const payload = context.payload as Payload;
  const sender = payload.sender.login;
  const issue = payload.issue;

  if (!body) {
    return `Please ask a question`;
  }

  if (!issue) {
    return `This command can only be used on issues`;
  }

  const reviewRegex = /^\/ask\spr-review/;
  const reviewMatches = body.match(reviewRegex);
  // we need to identify a pr review from an ask beginning with "/ask review"
  if (reviewMatches) {
    return await prReviewGPT();
  } else {
    const chatHistory: CreateChatCompletionRequestMessage[] = [];
    const streamlined: StreamlinedComment[] = [];
    let linkedPRStreamlined: StreamlinedComment[] = [];
    let linkedIssueStreamlined: StreamlinedComment[] = [];

    const regex = /^\/ask\s(.+)$/;
    const matches = body.match(regex);

    if (matches) {
      const [, body] = matches;

      // standard comments
      const comments = await getAllIssueComments(issue.number);
      // raw so we can grab the <!--- { 'UbiquityAI': 'answer' } ---> tag
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
        if (comment.user.type == UserType.User || commentsRaw[i].body.includes("<!--- { 'UbiquityAI': 'answer' } --->")) {
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
      } else {
        linkedIssueStreamlined = links.linkedIssues;
        linkedPRStreamlined = links.linkedPrs;
      }

      // let Chad deduce what is the most relevant context
      const gptDecidedContext = await decideContextGPT(chatHistory, streamlined, linkedPRStreamlined, linkedIssueStreamlined);

      if (linkedIssueStreamlined.length == 0 && linkedPRStreamlined.length == 0) {
        // No external context to add
        chatHistory.push(
          {
            role: "system",
            content: sysMsg,
            name: "UbiquityAI",
          } as CreateChatCompletionRequestMessage,
          {
            role: "user",
            content: body,
            name: sender,
          } as CreateChatCompletionRequestMessage
        );
      } else {
        chatHistory.push(
          {
            role: "system",
            content: sysMsg, // provide the answer template
            name: "UbiquityAI",
          } as CreateChatCompletionRequestMessage,
          {
            role: "system",
            content: "Original Context: " + JSON.stringify(gptDecidedContext), // provide the context
            name: "system",
          } as CreateChatCompletionRequestMessage,
          {
            role: "user",
            content: "Question: " + JSON.stringify(body), // provide the question
            name: "user",
          } as CreateChatCompletionRequestMessage
        );
      }

      const gptResponse: GPTResponse | string = await askGPT(body, chatHistory);

      if (typeof gptResponse === "string") {
        return gptResponse;
      } else if (gptResponse.answer) {
        return gptResponse.answer;
      } else {
        return `Error getting response from GPT`;
      }
    } else {
      return "Invalid syntax for ask \n usage: '/ask What is pi?";
    }
  }
};
