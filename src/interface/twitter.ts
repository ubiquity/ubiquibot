import Twit from "twit";
import { TWITTER_API_KEY, TWITTER_API_KET_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET } from "../configs/twitterauth";

const T = new Twit({
  consumer_key: TWITTER_API_KEY,
  consumer_secret: TWITTER_API_KET_SECRET,
  access_token: TWITTER_ACCESS_TOKEN,
  access_token_secret: TWITTER_ACCESS_TOKEN_SECRET,
  timeout_ms: 60 * 1000,
  strictSSL: true,
});

export const sendTweet = async (message: string) => {
  try {
    T.post("statuses/update", { status: message }, (err, data, response) => {
      if (err) {
        console.log(response);
      } else {
        console.log(data);
      }
    });
  } catch (error) {
    console.log("no answer", error);
  }
};
