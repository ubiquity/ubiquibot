import { getLogger } from "../bindings";
import axios, { AxiosError } from "axios";
import { ajv } from "../utils";
import { Static, Type } from "@sinclair/typebox";
import { backOff } from "exponential-backoff";

export const extractImportantWords = async (content: string): Promise<string[]> => {
  const res = await getAnswerFromChatGPT(
    "",
    `${
      process.env.CHATGPT_USER_PROMPT_FOR_IMPORTANT_WORDS ||
      "I need your help to find important words (e.g. unique adjectives) from github issue below and I want to parse them easily so please separate them using #(No other contexts needed). Please separate the words by # so I can parse them easily. Please answer simply as I only need the important words. Here is the issue content.\n"
    } '${content}'`,
    parseFloat(process.env.IMPORTANT_WORDS_AI_TEMPERATURE || "0")
  );
  if (res === "") return [];
  return res.split(/[,# ]/);
};

export const measureSimilarity = async (first: string, second: string): Promise<number> => {
  const res = await getAnswerFromChatGPT(
    "",
    `
      ${(
        process.env.CHATGPT_USER_PROMPT_FOR_MEASURE_SIMILARITY ||
        'I have two github issues and I need to measure the possibility of the 2 issues are the same content (I need to parse the % so other contents are not needed and give me only the number in %).\n Give me in number format and add % after the number.\nDo not tell other things since I only need the number (e.g. 85%). Here are two issues:\n 1. "%first%"\n2. "%second%"'
      )
        .replace("%first%", first)
        .replace("%second%", second)}`,
    parseFloat(process.env.MEASURE_SIMILARITY_AI_TEMPERATURE || "0")
  );
  const matches = res.match(/\d+/);
  const percent = matches && matches.length > 0 ? parseInt(matches[0]) : 0;
  if (!percent) {
    return 0;
  } else {
    return percent;
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
    const response = await backOff(() => axios(config), {
      startingDelay: 6000,
      retry: (e: AxiosError) => {
        if (e.response && e.response.status === 429) return true;
        return false;
      },
    });
    const data: Choices = response.data;
    const validate = ajv.compile(ChoicesSchema);
    const valid = validate(data);
    if (!valid) {
      logger.error(`Error occured from OpenAI`);
      throw new Error("Error occured from OpenAI");
    }
    const { choices: choice } = data;
    if (choice.length <= 0) {
      return "";
    }
    const answer = choice[0].message.content;
    return answer;
  } catch (error) {
    logger.error(`Getting response from ChatGPT failed: ${error}`);
    return "";
  }
};
