import Twit from "twit";
import { TWITTER_API_KEY, TWITTER_API_KET_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET } from "../configs/twitAuth";
import { Tweet } from "../types/tweet";
/* Creating a new instance of the Twit class. */
const T = new Twit({
  consumer_key: TWITTER_API_KEY,
  consumer_secret: TWITTER_API_KET_SECRET,
  access_token: TWITTER_ACCESS_TOKEN,
  access_token_secret: TWITTER_ACCESS_TOKEN_SECRET,
  timeout_ms: 60 * 1000,
  strictSSL: true,
});

/**
 * It takes in an object with a title, description, and url, and then posts a tweet with the title,
 * description, and url
 * @param {Tweet}  - title - The title of the issue
 */
export const sendTweet = ({ title, description, url }: Tweet) => {
  const message = `New issue:\n${title}\nDescription:\n${description}\n${url}`;
  if (message.length < 280) {
    T.post("statuses/update", { status: message }, (err, data, response) => {
      if (err) {
        console.log(response);
      } else {
        console.log(data);
      }
    });
  } else {
    const newMessage = `Issue:\n${title}\n${url}`;
    T.post("statuses/update", { status: newMessage }, (err, data, response) => {
      if (err) {
        console.log(response);
      } else {
        console.log(data);
      }
    });
  }
};
