import OpenAI from "openai";
import { getBotContext, getLogger } from "../../../bindings";
import { Payload } from "../../../types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const sysMsg = `You are the Ubiquity AI, you exist to answer technical questions in response to github issue comments.\n
You will return your response properly formatted using Github Flavored Markdown.\n
You will make effective use of the information provided in the issue comment.\n
You can use tables, lists, and code blocks to format your response.\n
There will be no continuous conversation, each comment is a new conversation.\n`;

export const askGPT = async (question: string) => {
  const logger = getLogger();
  logger.info(`Received '/ask' command from user: ${question}`);

  const response: OpenAI.Chat.Completions.ChatCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: sysMsg,
      },
      {
        role: "user",
        content: question,
      },
    ],
    model: "gpt-3.5-turbo",
  });

  const answers = response.choices.map((choice) => choice.message);

  logger.info(`GPT response: ${answers[0]}`);
  logger.info(`GPT response: ${answers[1]}`);
  logger.info(`GPT response: ${answers[2]}`);

  const answer: string | null = answers[0].content;

  return answer;
};

export const ask = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const sender = payload.sender.login;

  logger.info(`Received '/ask' command from user: ${sender}`);

  const issue = payload.issue;
  if (!issue) {
    logger.info(`Skipping '/ask' because of no issue instance`);
    return `Skipping '/ask' because of no issue instance`;
  }

  if (!body) {
    return `Please ask a question`;
  }

  const gptResponse = await askGPT(body);
  if (!gptResponse) {
    return `Error getting response from GPT`;
  }
  return gptResponse;
};
