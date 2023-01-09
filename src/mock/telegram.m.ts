import { TL_DEF_CHAT_IDS } from "../configs/blob";
import { telegramFormattedNotifier, telegramNotifier } from "../interface/telegram";

/**@method telegramNotifier - call unformatted issue */
telegramNotifier({
  chatIds: TL_DEF_CHAT_IDS,
  action: `new issue`,
  title: `Optimize CI/CD Build Speed`,
  description: `I worked through getting the build process to work by force \nmoving all dev dependencies into dependencies, but \nnow the build process is extremely slow on vercel.`,
  id: `10`,
  ref: `https://github.com/ubiquity/ubiquity-dollar/issues/10`,
  user: `pavlovcik`,
});

/**@method telegramNotifier - call unformatted pull */
telegramNotifier({
  chatIds: TL_DEF_CHAT_IDS,
  action: `new pull`,
  title: `Enhancement/styles`,
  description: `Small enhancements but mostly renamed the \ninternal smart contract references, and \nadded support for DAI and USDT in the inventory.`,
  id: `246`,
  ref: `https://github.com/ubiquity/ubiquity-dollar/pull/246`,
  user: `pavlovcik`,
});

/**@method telegramFormattedNotifier - call formatted issue */
telegramFormattedNotifier({
  chatIds: TL_DEF_CHAT_IDS,
  text:
    `<b>new issue: Optimize CI/CD Build Speed</b> ` +
    `<a href="https://github.com/ubiquity/ubiquity-dollar/issues/10">#10</a> ` +
    `<code>@</code>` +
    `<a href="https://github.com/pavlovcik">pavlovcik</a>\n` +
    `<code>I worked through getting the build process to work by force \nmoving all dev dependencies into dependencies, but \nnow the build process is extremely slow on vercel.</code>`,
  parseMode: "HTML",
});

/**@method telegramFormattedNotifier - call formatted pull */
telegramFormattedNotifier({
  chatIds: TL_DEF_CHAT_IDS,
  text:
    `<b>new pull: Enhancement/styles</b> ` +
    `<a href="https://github.com/ubiquity/ubiquity-dollar/pull/246">#246</a> ` +
    `<code>@</code>` +
    `<a href="https://github.com/pavlovcik">pavlovcik</a>\n` +
    `<code>Small enhancements but mostly renamed the \ninternal smart contract references, and \nadded support for DAI and USDT in the inventory.</code>`,
  parseMode: "HTML",
});
