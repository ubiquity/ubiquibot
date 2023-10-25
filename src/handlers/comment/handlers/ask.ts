import { getBotContext, getLogger } from "../../../bindings";
import { Payload, StreamlinedComment, UserType } from "../../../types";
import { getAllIssueComments, getAllLinkedIssuesAndPullsInBody } from "../../../helpers";
import { ChatCompletionMessageParam } from "openai/resources/chat";
import { askGPT, gptContextTemplate, sysMsg } from "../../../helpers/gpt";
import { ErrorDiff } from "../../../utils/helpers";
import fetch from "node-fetch";
import { SentencePieceProcessor, cleanText } from "sentencepiece-js";

/**
 * @param body The question to ask
 */
export const ask = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();

  const payload = context.payload as Payload;
  const issue = payload.issue;

  if (!body) {
    return `Please ask a question`;
  }

  if (!issue) {
    return `This command can only be used on issues`;
  }

  let chatHistory: ChatCompletionMessageParam[] = [];
  const streamlined: StreamlinedComment[] = [];
  let linkedPRStreamlined: StreamlinedComment[] = [];
  let linkedIssueStreamlined: StreamlinedComment[] = [];

  const regex = /^\/ask\s*([\s\S]*)$/;
  const matches = body.match(regex);

  if (matches) {
    const [, body] = matches;

    const sp = new SentencePieceProcessor();
    try {
      await sp.load(process.cwd() + "/src/declarations/tokenizer.model");
      await sp.loadVocabulary(process.cwd() + "/src/declarations/tokenizer.model");
    } catch (err) {
      console.log("====================================");
      console.log("err", err);
      console.log("====================================");
    }

    const encodee = (s: string, bos = true) => {
      const bosID = sp.encodeIds("<s>")[0];
      const eosID = sp.encodeIds("</s>")[0];

      if (typeof s !== "string") {
        throw new Error("encodee only accepts strings");
      }
      let t = sp.encodeIds(s);

      if (bos) {
        t = [bosID, ...t];
      }
      t = [...t, eosID];
      return t;
    };

    const comments = await getAllIssueComments(issue.number);
    const commentsRaw = await getAllIssueComments(issue.number, "raw");

    if (!comments) {
      logger.info(`Error getting issue comments`);
      return ErrorDiff(`Error getting issue comments`);
    }

    streamlined.push({
      login: issue.user.login,
      body: issue.body,
    });

    comments.forEach(async (comment, i) => {
      if (comment.user.type == UserType.User || commentsRaw[i].body.includes("<!--- { 'UbiquityAI': 'answer' } --->")) {
        streamlined.push({
          login: comment.user.login,
          body: comment.body,
        });
      }
    });

    // returns the conversational context from all linked issues and prs
    const links = await getAllLinkedIssuesAndPullsInBody(issue.number);

    if (typeof links === "string") {
      logger.info(`Error getting linked issues or prs: ${links}`);
    } else {
      linkedIssueStreamlined = links.linkedIssues;
      linkedPRStreamlined = links.linkedPrs;
    }

    const formatChat = (chat: { role?: string; content?: string; login?: string; body?: string }[]) => {
      if (chat.length === 0) return "";
      let chatString = "";
      chat.reduce((acc, message) => {
        if (!message) return acc;
        const role = acc.role || acc.login;
        const content = acc.content || acc.body;

        chatString += `${cleanText(role)}: ${cleanText(content)}\n\n`;

        acc = {
          role,
          content,
        };

        return acc;
      });
      console.log("chatString", chatString);
      return chatString;
    };

    chatHistory.push(
      {
        role: "system",
        content: gptContextTemplate,
      },
      {
        role: "user",
        content: `This issue/Pr context: \n ${JSON.stringify(streamlined)}`,
      }
    );

    if (linkedIssueStreamlined.length > 0) {
      chatHistory.push({
        role: "user",
        content: `Linked issue(s) context: \n ${JSON.stringify(linkedIssueStreamlined)}`,
      });
    } else if (linkedPRStreamlined.length > 0) {
      chatHistory.push({
        role: "user",
        content: `Linked Pr(s) context: \n ${JSON.stringify(linkedPRStreamlined)}`,
      });
    }

    const gptDecidedContext = await askGPT("ContextCall", chatHistory);

    const gptAnswer = typeof gptDecidedContext === "string" ? gptDecidedContext : gptDecidedContext.answer || "";
    const contextTokens = encodee(cleanText(gptAnswer));

    // console.log("gptDecidedContext", gptDecidedContext);
    // console.log("contextTokens", contextTokens);

    // const commentBeforeQuestion = streamlined[streamlined.length - 2];
    // const secondLast = streamlined[streamlined.length - 3];

    // const latestComments = [commentBeforeQuestion, secondLast];

    // const fmLatestComments = formatChat(latestComments);

    // const fmStreamlined = formatChat(streamlined);

    // const formats = [
    //   {
    //     quarter: "1st",
    //     content: `IssueSpec:  + ${issue.body} \n LastTwoComments: ${fmLatestComments} \n Question: ${body}`,
    //     current: contextTokens,
    //   },
    //   {
    //     quarter: "2nd",
    //     content: `IssueSpec:  + ${issue.body} \n LinkedIssueContext: ${formatChat(
    //       linkedIssueStreamlined
    //     )}\n LastTwoComments: ${fmLatestComments} \n Question: ${body}`,
    //     current: contextTokens,
    //   },
    //   {
    //     quarter: "3rd",
    //     content: `IssueSpec:  + ${issue.body} \n LinkedIssueContext: ${formatChat(linkedIssueStreamlined)}\n LinkedPRContext: ${formatChat(
    //       linkedPRStreamlined
    //     )} LastTwoComments: ${latestComments} \n Question: ${body}`,
    //     current: contextTokens,
    //   },
    //   {
    //     quarter: "4th",
    //     content: `IssueSpec:  + ${issue.body} \n LinkedIssueContext: ${formatChat(linkedIssueStreamlined)}\n LinkedPRContext: ${formatChat(
    //       linkedPRStreamlined
    //     )} CurrentIssueComments: ${fmStreamlined} \n Question: ${body}`,
    //     current: contextTokens,
    //   },
    // ];

    // const remainingTokens = (s: string) => {
    //   const max = 4096;
    //   const tokens = encodee(s).length;
    //   let nextActiveFourth = "";

    //   if (tokens < max / 4) {
    //     nextActiveFourth = "1st";
    //   } else if (tokens < max / 2) {
    //     nextActiveFourth = "2nd";
    //   } else if (tokens < (max / 4) * 3) {
    //     nextActiveFourth = "3rd";
    //   } else if (tokens < max) {
    //     nextActiveFourth = "4th";
    //   } else {
    //     nextActiveFourth = "Max";
    //   }

    //   const remaining = {
    //     content: s,
    //     current: tokens + formats[0].current,
    //     quarter: nextActiveFourth,
    //   };

    //   return remaining;
    // };

    // let selectedFormat = "";
    // let closestTokenCount = 0;

    // for (const format of formats) {
    //   const tokenCount = remainingTokens(cleanText(format.content)).current;
    //   if (tokenCount > closestTokenCount && tokenCount < 4096) {
    //     closestTokenCount = tokenCount;
    //     selectedFormat = format.content;
    //   }
    // }

    // if (selectedFormat === "") {
    //   return "Format selection failed.";
    // }

    // console.log("========================");
    // console.log("=== selectedFormat ===", selectedFormat);

    // const { quarter, current } = remainingTokens(cleanText(selectedFormat));

    // if (current >= 4096) {
    //   return "Format selection failed.";
    // }

    chatHistory = [];

    const tokenSize = contextTokens.length + encodee(body).length;

    if (tokenSize > 4096) {
      return "Your question is too long. Please ask a shorter question.";
    }

    chatHistory.push(
      {
        role: "system",
        content: `${sysMsg}`,
      },
      {
        role: "user",
        content: `Context: ${cleanText(gptAnswer)} \n Question: ${body}`,
      }
    );

    const chats = chatHistory.map((chat) => {
      return {
        role: chat.role,
        content: chat.content ? cleanText(chat.content) : "",
      };
    });

    const finalTokens = encodee(formatChat(chats), false);

    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: "Bearer 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",
      },
      body: JSON.stringify({
        model: "mistral-7b-instruct",
        messages: chatHistory,
      }),
    };

    const ans = await fetch("https://api.perplexity.ai/chat/completions", options).then((response) => response.json().catch((err) => console.log(err)));
    const answer = { tokens: ans.usage, text: ans.choices[0].message.content };
    const gptRes = await askGPT(body, chatHistory);

    const gptAns = typeof gptRes === "string" ? gptRes : gptRes.answer || "";
    const gptTokens = typeof gptRes === "string" ? [] : gptRes.tokenUsage || [];

    const comment = `
### Perp Tokens
\`\`\`json
${JSON.stringify(answer.tokens)}
\`\`\`

### GPT Tokens
\`\`\`json
${JSON.stringify(gptTokens)}
\`\`\

### SPP Tokens
\`\`\`json
Note: JSON in responses are throwing this off rn:  ${finalTokens.length + contextTokens.length} tokens
\`\`\`

### Perp Response
${answer.text}

</hr>

### GPT Response
${gptAns}
`;

    if (answer) {
      return comment;
    } else {
      return ErrorDiff(`Error getting response from GPT`);
    }
  } else {
    return "Invalid syntax for ask \n usage: '/ask What is pi?";
  }
};
