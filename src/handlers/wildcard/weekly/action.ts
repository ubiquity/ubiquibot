import axios from "axios";
import Jimp from "jimp";
import nodeHtmlToImage from "node-html-to-image";
import { getBotContext } from "../../../bindings";
import { telegramPhotoNotifier } from "../../../adapters";
import { Context } from "probot";
import { Payload } from "../../../types";
import { getFallback } from "../../../utils/fallback";
import { fetchImage } from "../../../utils/webAssets";
import { weeklyConfig } from "../../../configs/weekly";
import { ProximaNovaRegularBase64 } from "../../../assets/fonts/ProximaNovaRegularB64";
import { ClosedIssueIcon, CommitIcon, MergedPullIcon, OpenedIssueIcon, OpenedPullIcon } from "../../../assets/svgs";
import { wait } from "../../../helpers";

const IMG_PATH = "../../../assets/images";

const fetchEvents = async (context: Context): Promise<any[]> => {
  const payload = context.payload as Payload;
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
        org: payload.organization!.login,
        per_page: perPage,
        page: currentPage,
      });
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

type SummaryType = {
  commits: number;
  openedIssues: number;
  closedIssues: number;
  openedPRs: number;
  mergedPRs: number;
};

const processEvents = (JSONList: any[]): SummaryType => {
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

  let summaryInfo: string | SummaryType =
    `<code>new issues: ${openedIssues}</code>\n` +
    `<code>issues resolved: ${closedIssues}</code>\n` +
    `<code>total user interactions count: ${comments}</code>\n` +
    `<code>bounties given: ${bountiesUSD} USD</code>\n` +
    `<code>new pulls: ${openedPRs}</code>\n` +
    `<code>closed pulls: ${closedPRs}</code>\n` +
    `<code>merged pulls: ${mergedPRs}</code>\n` +
    `<code>total commits: ${commits}</code>\n`;
  // @note using it for future reference

  // summaryInfo =
  //   `📝 commits: ${commits}\n` +
  //   `📂 issues opened: ${openedIssues}\n` +
  //   `📁 issues closed: ${closedIssues}\n` +
  //   `📄 pull requests: ${openedPRs}\n` +
  //   `📑 pull requests merged: ${mergedPRs}\n`;

  summaryInfo = {
    commits,
    openedIssues,
    closedIssues,
    openedPRs,
    mergedPRs,
  };

  return summaryInfo;
};

const fetchSummary = async (repository: string): Promise<string> => {
  const { data } = await axios.post("https://app.whatthediff.ai/api/analyze", {
    repository,
  });
  const dataPadded = data.review.replaceAll("\n", "").replaceAll("<p>", "").replaceAll("</p>", "\n");
  return dataPadded;
};

const htmlImage = async (summaryInfo: SummaryType) => {
  const wrapElement = (nodeElem: SummaryType) => {
    return `
      <html>
      <body>
          <style>
              @font-face { 
                font-family: "ProximaNovaRegular";
                font-weight: 100 900;
                font-style: normal italic;
                src: url(data:application/font-woff;base64,${ProximaNovaRegularBase64});
              }
              
              html {
                  width: 100%;
                  height: 100%;
              }

              body {
                  font-family: 'ProximaNovaRegular', sans-serif;
                  font-size: 70px;
                  color: white;
                  width: 100%;
                  height: 100%;
                  margin: 0;
                  padding: 0;
              }

              .container {
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  width: 100%;
                  height: 100%;
              }

              .items {
                  display: flex;
                  flex-direction: column;
                  gap: 32px;
              }

              .item {
                  display: flex;
                  flex-direction: row;
                  align-items: center;
                  gap: 40px;
              }

              .title {
                  width: 700px;
                  white-space: nowrap;
              }

              .value-wrapper {
                  width: 240px;
                  text-align: end;
              }
          </style>
          <div class="container">
              <div class="items">
                  <div class="item">
                      <div class="icon">${CommitIcon}</div>
                      <div class="title">Commits</div>
                      <div class="value-wrapper">
                          <span class="value">${nodeElem.commits}</span>
                      </div>
                  </div>
                  <div class="item">
                      <div class="icon">${OpenedIssueIcon}</div>
                      <div class="title">Issues Opened</div>
                      <div class="value-wrapper">
                          <span class="value">${nodeElem.openedIssues}</span>
                      </div>
                  </div>
                  <div class="item">
                      <div class="icon">${ClosedIssueIcon}</div>
                      <div class="title">Issues Closed</div>
                      <div class="value-wrapper">
                          <span class="value">${nodeElem.closedIssues}</span>
                      </div>
                  </div>
                  <div class="item">
                      <div class="icon">${OpenedPullIcon}</div>
                      <div class="title">Pull Requests Opened</div>
                      <div class="value-wrapper">
                          <span class="value">${nodeElem.openedPRs}</span>
                      </div>
                  </div>
                  <div class="item">
                      <div class="icon">${MergedPullIcon}</div>
                      <div class="title">Pull Requests Merged</div>
                      <div class="value-wrapper">
                          <span class="value">${nodeElem.mergedPRs}</span>
                      </div>
                  </div>
              </div>
          </div>
      </body>

      </html>
    `;
  };

  await nodeHtmlToImage({
    output: `${IMG_PATH}/pmg.png`,
    html: await wrapElement(summaryInfo),
    transparent: true,
    puppeteerArgs: {
      waitForInitialPage: true,
      defaultViewport: { width: 2048, height: 1024 },
    },
  });
};

const getFlatImage = async (): Promise<string> => {
  const {
    remoteAsset: {
      flat: { remoteUrl, isUsing },
    },
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
  const pImage = await Jimp.read(`${IMG_PATH}/pmg.png`);
  const fImage = await getFlatImage();
  const image = await Jimp.read(fImage);
  image.composite(pImage, 0, 0);
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
  const payload = context.payload as Payload;
  const repository = payload.repository.full_name;
  const eventsList = await fetchEvents(context);
  const summaryInfo = processEvents(eventsList);
  const dataPadded = await fetchSummary(repository);
  await htmlImage(summaryInfo);
  await compositeImage();
  await processTelegram(dataPadded);
};
