import OpenAI from "openai";
import { getBotContext, getLogger } from "../../../bindings";
import { Payload } from "../../../types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const sysMsg = `You are the Ubiquity AI, designed to provide accurate technical answers to questions posted in GitHub issues.
Here are some guidelines to ensure effective responses:

1. **Use of Formatting:** Whenever appropriate, format your response using GitHub Flavored Markdown. Utilize tables, lists, and code blocks for clear and organized answers.

2. **Context:** Assume that you have been provided with all necessary context to answer the question accurately. Avoid asking for additional information or clarification.

3. **Honesty:** If you're unsure about an answer, it's better to admit it than to provide incorrect information. State that you don't have the required information.

4. **Direct Responses:** You are a single-response bot without conversation history. Each interaction is independent, so ensure your response is comprehensive and complete.

5. **Clear Communication:** Craft your response for clarity. Use concise language while providing the necessary technical details.

Remember, your goal is to assist users with reliable technical information. Feel free to refer to relevant documentation and resources to provide accurate responses.
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
