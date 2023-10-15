import Runtime from "../bindings/bot-runtime";
import axios, { AxiosError } from "axios";
import { ajv } from "../utils";
import { Static, Type } from "@sinclair/typebox";
import { backOff } from "exponential-backoff";
import { Issue } from "../types";

export async function extractImportantWords(issue: Issue): Promise<string[]> {
  const res = await getAnswerFromOpenAI(
    null,
    `${
      process.env.CHATGPT_USER_PROMPT_FOR_IMPORTANT_WORDS ||
      "I need your help to find important words (e.g. unique adjectives) from github issue below and I want to parse them easily so please separate them using #(No other contexts needed). Please separate the words by # so I can parse them easily. Please answer simply as I only need the important words. Here is the issue content.\n"
    } '${`Issue title: ${issue.title}\nIssue content: ${issue.body}`}'`,
    parseFloat(process.env.IMPORTANT_WORDS_AI_TEMPERATURE || "0")
  );
  if (res === null) return [];
  return res.split(/[,# ]/);
}

export async function measureSimilarity(first: Issue, second: Issue): Promise<number> {
  const res = await getAnswerFromOpenAI(
    null,
    `${(
      process.env.CHATGPT_USER_PROMPT_FOR_MEASURE_SIMILARITY ||
      'I have two github issues and I need to measure the possibility of the 2 issues are the same content (I need to parse the % so other contents are not needed and give me only the number in %).\n Give me in number format and add % after the number.\nDo not tell other things since I only need the number (e.g. 85%). Here are two issues:\n 1. "%first%"\n2. "%second%"'
    )
      .replace("%first%", `Issue title: ${first.title}\nIssue content: ${first.body}`)
      .replace("%second%", `Issue title: ${second.title}\nIssue content: ${second.body}`)}`,
    parseFloat(process.env.MEASURE_SIMILARITY_AI_TEMPERATURE || "0")
  );
  const matches = res.match(/\d+/);
  const percent = matches && matches.length > 0 ? parseInt(matches[0]) || 0 : 0;
  return percent;
}

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

export async function getAnswerFromOpenAI(
  systemPrompt: string | null,
  userPrompt: string,
  temperature = 0,
  max_tokens = 1500
): Promise<string> {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
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
      throw logger.error(`Error occurred from OpenAI`);
    }
    const { choices: choice } = data;
    if (choice.length <= 0) {
      throw logger.error(`No result from OpenAI`);
    }
    const answer = choice[0].message.content;
    return answer;
  } catch (error) {
    throw logger.error("Error occurred from OpenAI", error);
  }
}
