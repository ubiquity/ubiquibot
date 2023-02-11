import axios from "axios";
import sharp from "sharp";
import nodeHtmlToImage from "node-html-to-image";
import { getNextBotConfig, getOctokit } from "../../bindings";
import { telegramPhotoNotifier } from "../telegram";
import { BotConfig } from "../../types";

let JSONList: any[] = [];
let botConfig: BotConfig;
let dataPadded: string = "";
let summaryInfo: string = "";

const fetchBotConfig = async () => {
  botConfig = await getNextBotConfig();
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const fetchEvents = async () => {
  const octokit = getOctokit();
  const dateNow = Date.now(); //mills
  const currentDate = new Date(dateNow);
  const startTime = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1 < 10 ? `0${currentDate.getMonth() + 1}` : `${currentDate.getMonth() + 1}`}-${
    currentDate.getDate() < 10 ? `0${currentDate.getDate()}` : `${currentDate.getDate()}`
  }T00:00:00Z`;
  const startTimestamp = new Date(startTime).getTime();
  const endTimestamp = startTimestamp - 604800000; //7 days (seconds/milliseconds * 7)
  let shouldFetch = true;
  const elemList: any[] = [];
  let currentPage = 1;
  const perPage = 30;
  while (shouldFetch) {
    try {
      await wait(1000);
      const { data: pubOrgEvents } = await octokit.activity.listPublicOrgEvents({
        org: botConfig.git.org,
        per_page: perPage,
        page: currentPage,
      });
      console.log(pubOrgEvents);
      pubOrgEvents.forEach((elem: any) => {
        const elemTimestamp = new Date(elem.created_at as string).getTime();
        if (elemTimestamp <= startTimestamp && elemTimestamp >= endTimestamp) {
          //pass
          elemList.push(elem);
        } else if (elemTimestamp > startTimestamp) {
          //outta range
          //skip
        } else {
          //fail end
          shouldFetch = false;
        }
      });
      currentPage++;
    } catch (error) {
      shouldFetch = false;
    }
  }
  JSONList = elemList;
};

const processEvents = () => {
  let openedIssues: number = 0;
  let closedIssues: number = 0;
  let comments: number = 0;
  let bountiesUSD: number = 0;
  let openedPRs: number = 0;
  let closedPRs: number = 0;
  let mergedPRs: number = 0;
  let commits: number = 0;
  JSONList.forEach((elem: any) => {
    const { type: eventType } = elem;
    switch (eventType) {
      case "IssuesEvent":
        switch (elem.payload.action) {
          case "opened":
            openedIssues++;
            break;
          case "closed":
            closedIssues++;
            elem.payload.issue?.labels.forEach((elem: any) => {
              if (elem.name.includes("Price")) {
                const bountyUSD = parseInt(
                  elem.name
                    .toString()
                    .match(/\b\d+\b/)
                    .join("")
                );
                bountiesUSD += bountyUSD;
              }
            });
            break;
          default:
            break;
        }
        break;
      case "IssueCommentEvent":
        switch (elem.payload.action) {
          case "created":
            comments++;
            break;
          default:
            break;
        }
        break;
      case "PullRequestEvent":
        switch (elem.payload.action) {
          case "opened":
            openedPRs++;
            break;
          case "closed":
            if (elem.payload.pull_request?.merged === true) {
              mergedPRs++;
              commits += elem.payload.pull_request?.commits;
            } else {
              closedPRs++;
            }
            break;
          default:
            break;
        }
        break;
      case "PushEvent":
        commits += elem.payload.commits?.length;
        break;
      default:
        break;
    }
  });
  summaryInfo =
    `<code>new issues: ${openedIssues}</code>\n` +
    `<code>issues resolved: ${closedIssues}</code>\n` +
    `<code>total user interactions count: ${comments}</code>\n` +
    `<code>bounties given: ${bountiesUSD} USD</code>\n` +
    `<code>new pulls: ${openedPRs}</code>\n` +
    `<code>closed pulls: ${closedPRs}</code>\n` +
    `<code>merged pulls: ${mergedPRs}</code>\n` +
    `<code>total commits: ${commits}</code>\n`;
  console.log(summaryInfo);
};

const fetchSummary = async () => {
  const { data } = await axios.post("https://app.whatthediff.ai/api/analyze", {
    repository: `${botConfig.git.org}/${botConfig.git.repo}`,
  });
  dataPadded = data.review.replaceAll("\n", "");
  console.log(dataPadded);
};

const htmlImage = async () => {
  const wrapNode = (node: string) => {
    return `<div style='font-family: sans-serif; color: white;font-size: 70px;display:flex;flex-direction:column;align-items:center;'><div>${node}</div></div>`;
  };

  await nodeHtmlToImage({
    output: "./assets/hmg.png",
    html: await wrapNode(dataPadded),
    transparent: true,
    puppeteerArgs: {
      waitForInitialPage: true,
      defaultViewport: { width: 2080, height: 1024 },
    },
  });
};

const compositeImage = async () => {
  await sharp("./assets/flat.png")
    .ensureAlpha()
    .composite([
      {
        input: "./assets/hmg.png",
        top: 440,
        left: 100,
      },
    ])
    .toFile("./assets/fmg.png");
};

const processTelegram = async () => {
  await telegramPhotoNotifier({
    chatId: "-1000000", //should update with a valid one
    file: "./assets/fmg.png",
    caption: summaryInfo,
  });
};

export const init = async () => {
  await fetchBotConfig();
  await fetchEvents();
  await processEvents();
  await fetchSummary();
  await htmlImage();
  await compositeImage();
  await processTelegram();
};

export default init;
