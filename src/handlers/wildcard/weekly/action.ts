import axios from "axios";
import Jimp from "jimp";
import nodeHtmlToImage from "node-html-to-image";
import { getBotContext, getBotConfig } from "../../../bindings";
import { telegramPhotoNotifier } from "../../../adapters";
import { Context } from "probot";
import { BotConfig } from "../../../types";
import { getFallback } from "../../../utils/fallback";
import { fetchImage } from "../../../utils/webAssets";
import { weeklyConfig } from "../../../configs/weekly";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const IMG_PATH = "../../../assets/images";

const fetchEvents = async (context: Context, config: BotConfig): Promise<any[]> => {
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
      const { data: pubOrgEvents } = await context.octokit.activity.listPublicOrgEvents({
        org: config.git.org,
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
  return elemList;
};

const processEvents = (JSONList: any[]): string => {
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
  const summaryInfo =
    `<code>new issues: ${openedIssues}</code>\n` +
    `<code>issues resolved: ${closedIssues}</code>\n` +
    `<code>total user interactions count: ${comments}</code>\n` +
    `<code>bounties given: ${bountiesUSD} USD</code>\n` +
    `<code>new pulls: ${openedPRs}</code>\n` +
    `<code>closed pulls: ${closedPRs}</code>\n` +
    `<code>merged pulls: ${mergedPRs}</code>\n` +
    `<code>total commits: ${commits}</code>\n`;

  return summaryInfo;
};

const fetchSummary = async (org: string, repo: string): Promise<string> => {
  const { data } = await axios.post("https://app.whatthediff.ai/api/analyze", {
    repository: `${org}/${repo}`,
  });
  const dataPadded = data.review.replaceAll("\n", "");
  return dataPadded;
};

const htmlImage = async (dataPadded: string) => {
  const wrapNode = (node: string) => {
    return `<div style='font-family: sans-serif; color: white;font-size: 70px;display:flex;flex-direction:column;align-items:center;'><div>${node}</div></div>`;
  };

  await nodeHtmlToImage({
    output: `${IMG_PATH}/hmg.png`,
    html: await wrapNode(dataPadded),
    transparent: true,
    puppeteerArgs: {
      waitForInitialPage: true,
      defaultViewport: { width: 2080, height: 1024 },
    },
  });
};

const getFlatImage = async (): Promise<string> => {
  const {
    remoteAsset: { remoteUrl, isUsing },
  } = weeklyConfig;
  let fileName = `${IMG_PATH}/flat.png`;

  if (isUsing) {
    try {
      await fetchImage(remoteUrl);
      fileName = `${IMG_PATH}/webFlat.png`;
    } catch (error) {
      fileName = await getFallback(fileName, "background");
    }
  }
  return fileName;
};

const compositeImage = async () => {
  const hImage = await Jimp.read(`${IMG_PATH}/hmg.png`);
  const fImage = await getFlatImage();
  const image = await Jimp.read(fImage);
  image.composite(hImage, 200, 440);
  await image.writeAsync(`${IMG_PATH}/fmg.png`);
};

const processTelegram = async (caption: string) => {
  await telegramPhotoNotifier({
    chatId: "-1000000", //should update with a valid one
    file: `${IMG_PATH}/fmg.png`,
    caption,
  });
};

export const run = async () => {
  const context = getBotContext();
  const config = getBotConfig();
  const eventsList = await fetchEvents(context, config);
  const summaryInfo = processEvents(eventsList);
  const dataPadded = await fetchSummary(config.git.org, config.git.repo);
  await htmlImage(dataPadded);
  await compositeImage();
  await processTelegram(summaryInfo);
};
