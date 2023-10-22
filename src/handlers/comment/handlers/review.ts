import { getBotConfig, getBotContext, getLogger } from "../../../bindings";
import { Payload, StreamlinedComment } from "../../../types";
import { approvePullRequest, getAllIssueComments, getCommitsOnPullRequest, getPullByNumber, requestPullChanges } from "../../../helpers";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";
import { askGPT, getPRSpec, pullRequestBusinessLogicMsg, requestedChangesMsg, specCheckTemplate, validationMsg } from "../../../helpers/gpt";
import { ErrorDiff } from "../../../utils/helpers";
import OpenAI from "openai";

/**
 * @returns Pull Request Report
 */
export const review = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();

  const payload = context.payload as Payload;
  const issue = payload.issue;

  if (!issue) {
    return ErrorDiff(`Payload issue is undefined.`);
  }

  if (!body) {
    return ErrorDiff(`Payload body is undefined.`);
  }

  const isPr = await getPullByNumber(context, issue.number);

  if (!isPr) {
    return ErrorDiff(`Can only be used on pull requests.`);
  }

  const reviewRegex = /^\/review/;
  const reviewRegexMatch = body.match(reviewRegex);

  if (!reviewRegexMatch) {
    return ErrorDiff(`Error matching regex for review`);
  }

  const streamlined: StreamlinedComment[] = [];
  let chatHistory: CreateChatCompletionRequestMessage[] = [];
  const commentsRaw = await getAllIssueComments(issue.number, "raw");

  if (!commentsRaw) {
    logger.info(`Error getting issue comments`);
    return ErrorDiff(`Error getting issue comments.`);
  }

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

  const isPull = async () => {
    if (isPr) {
      const diff = await comparePR()
        .then(({ diff }) => {
          return diff;
        })
        .catch((error) => {
          logger.info(`Error getting diff: ${error}`);
          return ErrorDiff(`Error getting diff: ${error}`);
        });

      const spec = await getPRSpec(context, chatHistory, streamlined);

      chatHistory = [];
      chatHistory.push(
        {
          role: "system",
          content: specCheckTemplate,
        } as CreateChatCompletionRequestMessage,
        {
          role: "assistant",
          content: "Spec for Pr: \n" + JSON.stringify(spec),
        } as CreateChatCompletionRequestMessage,
        {
          role: "user",
          content: `${issue.assignees[0].login}'s PR Diff: \n` + JSON.stringify(diff),
        } as CreateChatCompletionRequestMessage
      );

      const gptResponse = await askGPT(`Pr review call for #${issue.number}`, chatHistory);

      chatHistory = [];
      chatHistory.push(
        {
          role: "system",
          content: validationMsg,
        } as CreateChatCompletionRequestMessage,
        {
          role: "assistant",
          content: `Validate for user: ${issue.assignees[0].login}: \n` + JSON.stringify(gptResponse),
        } as CreateChatCompletionRequestMessage
      );

      const res = await askGPT(`Pr review call for #${issue.number}`, chatHistory);

      chatHistory = [];
      chatHistory.push(
        {
          role: "system",
          content: pullRequestBusinessLogicMsg,
        } as CreateChatCompletionRequestMessage,
        {
          role: "assistant",
          content: `Handle business logic for:\n` + JSON.stringify(res),
        } as CreateChatCompletionRequestMessage
      );

      const validated = await reviewGPT(issue.number, chatHistory, issue.assignees[0].login);

      console.log("====================================");
      console.log(validated);
      console.log("====================================");

      const readme = await findFileInRepo(context, "readme.md");
      const contributing = await findFileInRepo(context, "contributing.md");

      const finalComment = `
      ## Helpful links\n\n
      - [Readme](${readme?.data.download_url})\n
      - [Contributing](${contributing?.data.download_url})\n\n
      `;

      if (typeof validated === "string") {
        return validated;
      } else if (validated === null) {
        return finalComment;
      } else {
        if (validated) {
          return validated.answer;
        } else {
          return ErrorDiff(`Validating the pull request response may have failed.`);
        }
      }
    } else {
      return ErrorDiff(`No PR found for issue #${issue.number}`);
    }
  };

  const res = await isPull();
  if (res && res.startsWith("```diff\n")) {
    return res;
  } else {
    return res + `\n###### Ensure the pull request requirements are in the linked issue's first comment and update it if the scope evolves.`;
  }
};

export const reviewGPT = async (pullNumber: number, chatHistory: CreateChatCompletionRequestMessage[], user: string) => {
  const logger = getLogger();
  const config = getBotConfig();

  if (!config.ask.apiKey) {
    logger.info(`No OpenAI API Key provided`);
    return ErrorDiff("You must configure the `openai-api-key` property in the bot configuration in order to use AI powered features.");
  }

  const openAI = new OpenAI({
    apiKey: config.ask.apiKey,
  });

  const reviewFunctions: OpenAI.Chat.Completions.ChatCompletionCreateParams.Function[] = [
    {
      name: "approvePullRequest",
      description: "If the spec has been achieved and the code is good, approve the pull request.",
      parameters: {
        type: "object",
        properties: {},
        require: [],
      },
    },
    {
      name: "requestPullChanges",
      description: "Only if the spec hasn't been achieved and if changes are needed request them as a review on the pull request.",
      parameters: {
        type: "object",
        properties: {
          comments: {
            type: "array",
            description: "An array of comment objects.",
            items: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "The relative path to the file in the repository.",
                },
                start_line: {
                  type: "number",
                  description: "The start_line is the first line in the pull request diff that your multi-line comment applies to. ",
                },
                line: {
                  type: "number",
                  description:
                    "The line of the blob in the pull request diff that the comment applies to. For a multi-line comment, the last line of the range that your comment applies to.",
                },
                body: {
                  type: "string",
                  description: "The content of the comment.",
                },
              },
              require: ["path", "line", "body", "start_line"],
            },
          },
        },
        require: ["comments"],
      },
    },
  ];

  const res: OpenAI.Chat.Completions.ChatCompletion = await openAI.chat.completions.create({
    messages: chatHistory,
    model: "gpt-3.5-turbo-16k-0613",
    max_tokens: config.ask.tokenLimit,
    temperature: 0,
    functions: reviewFunctions,
    function_call: "auto",
  });

  const functionName = res.choices[0].message.function_call?.name;
  const functionArgs = res.choices[0].message.function_call?.arguments;
  const answer = res.choices[0].message.content;

  const tokenUsage = {
    output: res.usage?.completion_tokens,
    input: res.usage?.prompt_tokens,
    total: res.usage?.total_tokens,
  };

  // const approvedPullMsg = `{escapeMsg} `;

  console.log("==================asndwqneisahd==================");
  console.log(answer);
  console.log("====================================");

  switch (functionName) {
    case "approvePullRequest": {
      console.log("================approvePullRequest====================");
      console.log("approvePullRequest");
      console.log("====================================");
      logger.info(`Reverted pull request #${pullNumber} to draft status.`);
      chatHistory.push({
        role: "function",
        name: "approvePullRequest",
        content:
          `The pull request has been approved, let ${user} know that you have approved the pull request and they should submit it ready for review and the reviewers will follow up shortly.` +
          answer,
      } as CreateChatCompletionRequestMessage);
      const answ = await askGPT(`Pr function call for #${pullNumber}`, chatHistory);

      await approvePullRequest(pullNumber);

      console.log("=================approvePullRequest===================");
      console.log(answ);
      console.log("====================================");
      return answ;
    }
    case "requestPullChanges": {
      let obj: any = {};
      if (functionArgs) {
        obj = JSON.parse(functionArgs);
      }

      const allCommits = await getCommitsOnPullRequest(pullNumber);
      const commit = allCommits[0].sha;

      console.log("================requestPullChanges====================");
      console.log(obj);
      console.log("====================================");

      logger.info(`Requested changes on pull request #${pullNumber}.`);
      chatHistory.push(
        {
          role: "function",
          name: "requestPullChanges",
          content: `${answer}`,
        } as CreateChatCompletionRequestMessage,
        {
          role: "user",
          content: `${requestedChangesMsg}` + user + `\n` + JSON.stringify(obj.comments),
        } as CreateChatCompletionRequestMessage
      );
      const answ = await askGPT(`Pr review call for #${pullNumber}`, chatHistory);
      const finalAnswer = typeof answ === "string" ? answ : answ.answer;

      await requestPullChanges(pullNumber, obj.comments, commit, finalAnswer);
      return null;
    }
    default:
      return {
        answer,
        tokenUsage,
      };
  }
};

async function findFileInRepo(context: any, fileName: string): Promise<any> {
  const { owner, repo } = context.repo();

  try {
    const { data: tree } = await context.octokit.git.getTree({
      owner,
      repo,
      tree_sha: "HEAD",
      recursive: "1",
    });

    const file = tree.tree.find((f: any) => f.type === "blob" && f.path.toLowerCase().endsWith(fileName.toLowerCase()));

    if (!file) {
      return null;
    }

    return await context.octokit.repos.getContent({
      owner,
      repo,
      path: file.path,
    });
  } catch (error) {
    console.error(`Error finding ${fileName} in repository:`, error);
    return null;
  }
}
