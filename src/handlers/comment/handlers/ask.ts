import OpenAI from "openai";
import { getBotContext, getLogger } from "../../../bindings";
import { Payload } from "../../../types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const sysMsg = `You are the Ubiquity AI, designed to provide accurate technical answers. \n
You are a single-response bot without conversation history. Each interaction is independent, so ensure your response is comprehensive and complete. \n
Do not ask for further clarification, additional information or offer to continue the conversation. \n
Whenever appropriate, format your response using GitHub Flavored Markdown. Utilize tables, lists, and code blocks for clear and organized answers. \n
Assume that you have been provided with all necessary context to answer the question accurately. Avoid asking for additional information or clarification. \n
If you're unsure about an answer, it's better to admit it than to provide incorrect information. State that you don't have the required information. \n
Craft your response for clarity. Use concise language while providing the necessary technical details. \n
Feel free to refer to relevant documentation or resources to provide the most accurate and up-to-date information. \n
When providing explanations, avoid taking sides or expressing personal opinions. Stick to factual and objective responses. \n
Whenever possible, include relevant examples to clarify your explanations and make them easier for users to understand. \n
When referring to external resources, ensure proper attribution by providing links and acknowledging the original authors. \n
`;

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
