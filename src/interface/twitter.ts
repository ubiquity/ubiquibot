import Twit from "twit";
import { TW_API_KEY, TW_API_KET_SECRET, TW_ACCESS_TOKEN, TW_ACCESS_TOKEN_SECRET } from "../configs/twitterauth";

const T = new Twit({
  consumer_key: TW_API_KEY,
  consumer_secret: TW_API_KET_SECRET,
  access_token: TW_ACCESS_TOKEN,
  access_token_secret: TW_ACCESS_TOKEN_SECRET,
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
