import { Comment, Issue } from "../../../../types/payload";
// import OpenAI from "openai";
import { encodingForModel } from "js-tiktoken";

const botCommandsAndCommentsFilter = (comment) => !comment.body.startsWith("/") && comment.user.type === "User";

export function calculateQualScore(issue: Issue, comments: Comment[]) {
  const tokens = countTokensOfConversation(issue, comments);
  const estimatedOptimalModel = estimateOptimalModel(tokens);
  return { tokens, estimatedOptimalModel };
}

function estimateOptimalModel(sumOfTokens: number) {
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

function countTokensOfConversation(issue: Issue, comments: Comment[]) {
  const gpt3TurboEncoder = encodingForModel("gpt-3.5-turbo");
  const specificationComment = issue.body;
  if (!specificationComment) {
    throw new Error("Issue specification comment is missing");
  }

  const contributorCommentsWithTokens = comments.filter(botCommandsAndCommentsFilter).map((comment) => {
    return {
      tokens: gpt3TurboEncoder.encode(comment.body),
      comment,
    };
  });

  // const contributorCommentsTokens = contributorCommentsWithTokens.map(({ tokens }) => tokens);
  const sumOfContributorTokens = contributorCommentsWithTokens.reduce((acc, { tokens }) => acc + tokens.length, 0);
  const specificationTokens = gpt3TurboEncoder.encode(specificationComment);
  const sumOfSpecificationTokens = specificationTokens.length;
  const totalSumOfTokens = sumOfSpecificationTokens + sumOfContributorTokens;
  // const estimatedOptimalModel = estimateOptimalModel(totalSumOfTokens);

  // const buffer = {
  //   totalSumOfTokens,
  //   estimatedOptimalModel,
  // };
  // return buffer;
  return totalSumOfTokens;
}

// async function gpt() {
//   // /v1/chat/completions
//   const openai = new OpenAI(); // apiKey: // defaults to process.env["OPENAI_API_KEY"]
//   const params: OpenAI.Chat.ChatCompletionCreateParams = {
//     messages: [{ role: "user", content: "Say this is a test" }],
//     model: "gpt-3.5-turbo",
//   };
//   const chatCompletion: OpenAI.Chat.ChatCompletion = await openai.chat.completions.create(params);
// }
