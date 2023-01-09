import { Telegraf } from "telegraf";
import { TL_BOT_TOKEN, TL_BOT_DELAY } from "../configs/blob";
import { TLMessageFormattedPayload, TLMessagePayload } from "../types/static";

const bot = new Telegraf(TL_BOT_TOKEN);

export const messageFormatter = (messagePayload: TLMessagePayload) => {
  const { action, title, description, id, ref, user } = messagePayload;
  const msgObj =
    `<b>${action}: ${title}</b> ` +
    `<a href="${ref}">#${id}</a> ` +
    `<code>@</code>` +
    `<a href="https://github.com/${user}">${user}</a>\n` +
    `<code>${description}</code>`;

  return msgObj;
};

export const telegramFormattedNotifier = (messagePayload: TLMessageFormattedPayload) => {
  const { chatIds, text, parseMode } = messagePayload;

  let currentElem = 0;

  const sendHandler = () => {
    if (currentElem === chatIds.length) {
      return;
    }

    const sendInterval = setInterval(async () => {
      clearInterval(sendInterval);
      await bot.telegram.sendMessage(chatIds[currentElem], text, { parse_mode: parseMode });
      currentElem++;
      sendHandler();
    }, TL_BOT_DELAY);
  };
  sendHandler();
};

export const telegramNotifier = (messagePayload: TLMessagePayload) => {
  const messageString = messageFormatter(messagePayload);
  const messageObj: TLMessageFormattedPayload = {
    chatIds: messagePayload.chatIds,
    text: messageString,
    parseMode: "HTML",
  };
  telegramFormattedNotifier(messageObj);
};
