import { getLogger } from "../bindings";
import axios from "axios";
import { ajv } from "../utils";
import { Static, Type } from "@sinclair/typebox";

export const extractImportantWords = async (content: string): Promise<string[]> => {
  const res = await getAnswerFromChatGPT(
    `${
      process.env.CHATGPT_SYSTEM_PROMPT_FOR_IMPORTANT_WORDS ||
      "You are an 'important words finder'. You need to find important words from given context. You only have to give important words from given context and you have to separate the words by #"
    }`,
    `${
      process.env.CHATGPT_USER_PROMPT_FOR_IMPORTANT_WORDS ||
      "I need your help to find duplicate issues on my GitHub repository. For context, the entire strategy is the following:\n\n1. A new issue is posted\n2. We ask you to extract a word list of the most \"important\" (i.e. unique adjectives?) words.\n3. We search the repository for all issues with the important words.\n4. We go from highest issue number (most recent) and read the issue description.\n5. If >80% confidence that it's a redundant issue, stop the search and link back to it with a warning saying that it's likely to be a duplicate.\nRight now, we are on step 2.\n"
    } '${content}'`,
    parseFloat(process.env.IMPORTANT_WORDS_AI_TEMPERATURE || "0")
  );
  return res.split("#");
};

export const measureSimilarity = async (first: string, second: string): Promise<number> => {
  const res = await getAnswerFromChatGPT(
    `${process.env.CHATGPT_SYSTEM_PROMPT_FOR_MEASURE_SIMILARITY || "You are a 'similarity measurer'. Give percent in number. (e.g. 30%)"}`,
    `
      ${(
        process.env.CHATGPT_USER_PROMPT_FOR_MEASURE_SIMILARITY ||
        'I have two github issues.\nOne is "%first"%\nand\nother is "%second"%Please give me the possibility of the 2 issues are the same content.\n Give me in number format and add % after the number.\nDo not tell other things since I only need the number.'
      )
        .replace("%first%", first)
        .replace("%second%", second)}`,
    parseFloat(process.env.MEASURE_SIMILARITY_AI_TEMPERATURE || "0")
  );
  const percent = res.split("%")[0].split(" ").pop();
  if (!percent) {
    return 0;
  } else {
    return parseFloat(percent);
  }
};

const ChatMessageSchema = Type.Object({
  content: Type.String(),
});

const ChoiceSchema = Type.Object({
  message: ChatMessageSchema,
});

const ChoicesSchema = Type.Object({
  choices: Type.Array(ChoiceSchema),
});

type Choices = Static<typeof ChoicesSchema>;

export const getAnswerFromChatGPT = async (systemPrompt: string, userPrompt: string, temperature = 0, max_tokens = 1500): Promise<string> => {
  const logger = getLogger();
  const body = JSON.stringify({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    max_tokens,
    temperature,
    stream: false,
  });
  const config = {
    method: "post",
    url: `${process.env.OPENAI_API_HOST || "https://api.openai.com"}/v1/chat/completions`,
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    data: body,
  };
  try {
    const response = await axios(config);
    const data: Choices = response.data;
    const validate = ajv.compile(ChoicesSchema);
    const valid = validate(data);
    if (!valid) {
      throw new Error("Error occured from OpenAI");
    }
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
