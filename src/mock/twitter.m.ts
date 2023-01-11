import { sendTweet } from "../interface/twitter";

/* Sending a tweet. */
sendTweet({
  title: "Do Not Automatically Include Range Labels #73",
  description: "the ranges are annoying and cloud the label space",
  url: "https://github.com/ubiquity/bounty-bot/issues/73",
});

sendTweet({
  title: `Design database schemas and developer database adapter #46`,
  description: `We're gonna plan to use supabase which is open-source firebase alternative. This is originally a postgres database.`,
  url: `https://github.com/ubiquity/bounty-bot/issues/46`,
});
