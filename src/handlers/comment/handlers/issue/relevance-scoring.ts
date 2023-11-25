import Decimal from "decimal.js";
import { encodingForModel } from "js-tiktoken";
import OpenAI from "openai";
import { Context } from "../../../../types";
import { Comment, Issue } from "../../../../types/payload";

export async function relevanceScoring(context: Context, issue: Issue, contributorComments: Comment[]) {
  const tokens = countTokensOfConversation(issue, contributorComments);
  const estimatedOptimalModel = estimateOptimalModel(tokens);
  const score = await sampleRelevanceScores(context, contributorComments, estimatedOptimalModel, issue);
  return { score, tokens, model: estimatedOptimalModel };
}

export function estimateOptimalModel(sumOfTokens: number) {
  // we used the gpt-3.5-turbo encoder to estimate the amount of tokens.
  // this also doesn't include the overhead of the prompting etc so this is expected to be a slight underestimate
  if (sumOfTokens <= 4097) {
    return "gpt-3.5-turbo";
  } else if (sumOfTokens <= 16385) {
    // TODO: maybe use gpt-3.5-turbo-16k encoder to recalculate tokens
    return "gpt-3.5-turbo-16k";
  } else {
    // TODO: maybe use gpt-4-32k encoder to recalculate tokens
    console.warn("Backup plan for development purposes only, but using gpt-4-32k due to huge context size");
    return "gpt-4-32k";
  }
}

export function countTokensOfConversation(issue: Issue, comments: Comment[]) {
  const specificationComment = issue.body;
  if (!specificationComment) {
    throw new Error("Issue specification comment is missing");
  }

  const gpt3TurboEncoder = encodingForModel("gpt-3.5-turbo");
  const contributorCommentsWithTokens = comments.map((comment) => ({
    tokens: gpt3TurboEncoder.encode(comment.body),
    comment,
  }));

  const sumOfContributorTokens = contributorCommentsWithTokens.reduce((acc, { tokens }) => acc + tokens.length, 0);
  const specificationTokens = gpt3TurboEncoder.encode(specificationComment);
  const sumOfSpecificationTokens = specificationTokens.length;
  const totalSumOfTokens = sumOfSpecificationTokens + sumOfContributorTokens;

  return totalSumOfTokens;
}

export async function gptRelevance(
  context: Context,
  model: string,
  ISSUE_SPECIFICATION_BODY: string,
  CONVERSATION_STRINGS: string[],
  ARRAY_LENGTH = CONVERSATION_STRINGS.length
) {
  const openAi = context.openAi;
  if (!openAi) throw new Error("OpenAI adapter is not defined");
  const PROMPT = `I need to evaluate the relevance of GitHub contributors' comments to a specific issue specification. Specifically, I'm interested in how much each comment helps to further define the issue specification or contributes new information or research relevant to the issue. Please provide a float between 0 and 1 to represent the degree of relevance. A score of 1 indicates that the comment is entirely relevant and adds significant value to the issue, whereas a score of 0 indicates no relevance or added value. Each contributor's comment is on a new line.\n\nIssue Specification:\n\`\`\`\n${ISSUE_SPECIFICATION_BODY}\n\`\`\`\n\nConversation:\n\`\`\`\n${CONVERSATION_STRINGS.join(
    "\n"
  )}\n\`\`\`\n\n\nTo what degree are each of the comments in the conversation relevant and valuable to further defining the issue specification? Please reply with an array of float numbers between 0 and 1, corresponding to each comment in the order they appear. Each float should represent the degree of relevance and added value of the comment to the issue. The total length of the array in your response should equal exactly ${ARRAY_LENGTH} elements.`;
  const response: OpenAI.Chat.ChatCompletion = await openAi.chat.completions.create({
    model: model,
    messages: [
      {
        role: "system",
        content: PROMPT,
      },
    ],
    temperature: 1,
    max_tokens: 64,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  try {
    const parsedResponse = JSON.parse(response.choices[0].message.content as "[1, 1, 0.5, 0]") as number[];
    return parsedResponse;
  } catch (error) {
    return [];
  }
}

async function sampleRelevanceScores(
  context: Context,
  contributorComments: Comment[],
  estimatedOptimalModel: ReturnType<typeof estimateOptimalModel>,
  issue: Issue
) {
  const BATCH_SIZE = 10;
  const BATCHES = 1;
  const correctLength = contributorComments.length;
  const batchSamples = [] as Decimal[][];

  for (let attempt = 0; attempt < BATCHES; attempt++) {
    const fetchedSamples = await fetchSamples(context, {
      contributorComments,
      estimatedOptimalModel,
      issue,
      maxConcurrency: BATCH_SIZE,
    });
    const filteredSamples = filterSamples(context, fetchedSamples, correctLength);
    const averagedSample = averageSamples(filteredSamples, 10);
    batchSamples.push(averagedSample);
  }
  const average = averageSamples(batchSamples, 4);

  return average;
}

async function fetchSamples(
  context: Context,
  { contributorComments, estimatedOptimalModel, issue, maxConcurrency }: InEachRequestParams
) {
  const commentsSerialized = contributorComments.map((comment) => comment.body);
  const batchPromises = [];
  for (let i = 0; i < maxConcurrency; i++) {
    const requestPromise = gptRelevance(context, estimatedOptimalModel, issue.body, commentsSerialized);
    batchPromises.push(requestPromise);
  }
  const batchResults = await Promise.all(batchPromises);
  return batchResults;
}

interface InEachRequestParams {
  contributorComments: Comment[];
  estimatedOptimalModel: ReturnType<typeof estimateOptimalModel>;
  issue: Issue;
  maxConcurrency: number;
}

function filterSamples(context: Context, batchResults: number[][], correctLength: number) {
  return batchResults.filter((result) => {
    if (result.length != correctLength) {
      context.logger.error("Correct length is not defined", {
        batchResultsLength: batchResults.length,
        result,
      });
      return false;
    } else {
      return true;
    }
  });
}

function averageSamples(batchResults: (number | Decimal)[][], precision: number) {
  const averageScores = batchResults[0]
    .map((_, columnIndex) => {
      let sum = new Decimal(0);
      batchResults.forEach((row) => {
        sum = sum.plus(row[columnIndex]);
      });
      return sum.dividedBy(batchResults.length);
    })
    .map((score) => score.toDecimalPlaces(precision));

  // console.trace(`${JSON.stringify(batchResults)} -> ${JSON.stringify(averageScores)}`);
  return averageScores;
}
