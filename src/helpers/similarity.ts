import { getBotContext, getLogger } from "../bindings";
import { Payload, Choices, MarkdownItem } from "../types";
import { getBotConfig } from "../bindings";
import axios from "axios";
import { parseComments } from "./comment";

const ItemsToExclude: string[] = [MarkdownItem.BlockQuote];

export const countIncludedWords = (inputString: string, words: string[]): number => {
  const body = parseComments([inputString], ItemsToExclude);

  let count = 0;
  console.log("parsed body~~~~~" + body);
  for (const word of words) {
    // if (body.includes(word.toLowerCase())) {
    //   count++;
    // }
  }

  return count;
};

export const extractImportantWords = async (): Promise<string[]> => {
  const { payload: _payload } = getBotContext();
  const issue = (_payload as Payload).issue;
  if (!issue?.body) return [];
  const res = await getAnswerFromChatGPT(`'Issue title: "${issue.title}"\nIssue body: "${issue.body}"'`);
  return res.split("#");
};

export const getAnswerFromChatGPT = async (prompt: string): Promise<string> => {
  const logger = getLogger();
  const {
    similarity: { openaiSystemPrompt, openaiUserPrompt },
  } = getBotConfig();
  const body = JSON.stringify({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          openaiSystemPrompt ||
          "You are an 'important words finder'. You need to find important words from given context. You only have to give important words from given context and you have to separate the words by #",
      },
      {
        role: "user",
        content:
          (openaiUserPrompt ||
            "I need your help to find duplicate issues on my GitHub repository. For context, the entire strategy is the following:\n\n1. A new issue is posted\n2. We ask you to extract a word list of the most \"important\" (i.e. unique adjectives?) words.\n3. We search the repository for all issues with the important words.\n4. We go from highest issue number (most recent) and read the issue description.\n5. If >80% confidence that it's a redundant issue, stop the search and link back to it with a warning saying that it's likely to be a duplicate.\nRight now, we are on step 2.\n") +
          prompt,
      },
    ],
    max_tokens: 1500,
    temperature: 0,
    stream: false,
  });
  const config = {
    method: "post",
    url: "https://api.openai.com/v1/chat/completions",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    data: body,
  };
  try {
    const response = await axios(config);
    const data: Choices = response.data;
    const { choices: choice } = data;
    if (choice.length <= 0) {
      return "";
    }
    const answer = choice[0].message.content;
    return answer;
  } catch (error) {
    logger.debug(`Getting response from ChatGPT failed: ${error}`);
    return "";
  }
};
