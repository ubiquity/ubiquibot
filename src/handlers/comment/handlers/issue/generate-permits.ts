import Decimal from "decimal.js";
import { stringify } from "yaml";
import Runtime from "../../../../bindings/bot-runtime";
import { getTokenSymbol } from "../../../../helpers/contracts";
import { Comment, Context } from "../../../../types";
import structuredMetadata from "../../../shared/structured-metadata";
import { generatePermit2Signature } from "./generate-permit-2-signature";
import { ContributorClassNames } from "./specification-scoring";
import { ScoresByUser, CommentDetailsType } from "./issue-shared-types";
import { FormatScoreDetails, Tags } from "./comment-scoring-rubric";

export async function generatePermits(context: Context, totals: ScoresByUser) {
  // const userIdToNameMap = mapIdsToNames(totals);

  const { html: comment, permits } = await generateComment(context, totals);
  const metadata = structuredMetadata.create("Permits", { permits, totals });
  return comment.concat("\n", metadata);
}

async function generateComment(context: Context, totals: ScoresByUser) {
  const runtime = Runtime.getState();
  const {
    payout: { paymentToken, rpc, privateKey },
  } = context.config;

  const detailsTable = generateDetailsTable(totals);
  const tokenSymbol = await getTokenSymbol(paymentToken, rpc);
  const HTMLs = [] as string[];

  const permits = [];

  for (const userId in totals) {
    const userTotals = totals[userId];

    const tokenAmount = userTotals.total;

    const contributorName = userTotals.username;
    const contributionClassName = userTotals.class;

    if (!privateKey) throw runtime.logger.warn("No bot wallet private key defined");

    const beneficiaryAddress = await runtime.adapters.supabase.wallet.getAddress(parseInt(userId));

    const permit = await generatePermit2Signature(context, {
      beneficiary: beneficiaryAddress,
      amount: tokenAmount,
      identifier: contributionClassName,
      userId: userId,
    });

    permits.push(permit);

    const html = generateHtml({
      permit: permit.url,
      tokenAmount,
      tokenSymbol,
      contributorName,
      detailsTable,
      issueRole: contributionClassName,
    });
    HTMLs.push(html);
  }
  return { html: HTMLs.join("\n"), permits };
}
function generateHtml({
  permit,
  tokenAmount,
  tokenSymbol,
  contributorName,
  detailsTable,
  issueRole,
}: GenerateHtmlParams) {
  return `
  <details>
    <summary>
      <b
        ><h3>
          <a
            href="${permit.toString()}"
          >
            [ ${tokenAmount} ${tokenSymbol} ]</a
          >
        </h3>
        <h6>&nbsp;${issueRole}&nbsp;Comments&nbsp;@${contributorName}</h6></b
      >
    </summary>
    ${detailsTable}
  </details>
  `;
}

function generateDetailsTable(totals: ScoresByUser) {
  let tableRows = "";

  for (const user of Object.values(totals)) {
    for (const detail of user.details) {
      const sourceDetails = detail.source;
      const scoringDetails = detail.scoring;
      // they will have the same index and length to refer to the same comment
      // const specificationDetails = scoringDetails.specification;
      // const taskDetails = scoringDetails.task;

      const commentSources = sourceDetails.comments;
      const commentScores = scoringDetails.comments;

      if (!commentSources) continue;
      if (!commentScores) continue;

      for (const index in commentSources) {
        //
        const commentSource = commentSources[index];
        const commentScore = commentScores[index];

        const commentUrl = commentSource.html_url;
        const truncatedBody = commentSource ? commentSource.body.substring(0, 64).concat("...") : "";
        const formatScoreDetails = commentScore.formattingScoreDetails;

        const newFormatScoreDetails = {} as FormatScoreDetails; // { [elementId: string]: { count: number; score: number; words: number } };
        for (const _element in formatScoreDetails) {
          const element = _element as Tags;
          newFormatScoreDetails[element] = {
            ...formatScoreDetails[element],
            score: Number(formatScoreDetails[element].score),
          };
        }
        let formatDetailsStr = "";
        if (newFormatScoreDetails && Object.keys(newFormatScoreDetails).length > 0) {
          const ymlElementScores = stringify(newFormatScoreDetails);
          formatDetailsStr = ["", `<pre>${ymlElementScores}</pre>`, ""].join("\n"); // weird rendering quirk with pre that needs breaks
        } else {
          formatDetailsStr = "-";
        }

        const quantScore = zeroToHyphen(commentScore.wordScore.plus(commentScore.formattingScore));
        const qualScore = zeroToHyphen(commentScore.relevanceScore);
        const credit = zeroToHyphen(commentScore.finalScore);
        let formatScoreCell;
        if (formatDetailsStr != "-") {
          formatScoreCell = `<details><summary>${quantScore}</summary>${formatDetailsStr}</details>`;
        } else {
          formatScoreCell = quantScore;
        }
        tableRows += `<tr><td><h6><a href="${commentUrl}">${truncatedBody}</a></h6></td><td>${formatScoreCell}</td><td>${qualScore}</td><td>${credit}</td></tr>`;
      }
    }
  }
  return `<table><tbody><tr><td>Comment</td><td>Formatting</td><td>Relevance</td><td>Reward</td></tr>${tableRows}</tbody></table>`;
}

function zeroToHyphen(value: number | Decimal) {
  if (value instanceof Decimal ? value.isZero() : value === 0) {
    return "-";
  } else {
    return value.toString();
  }
}

// function mapIdsToNames(allUserTotals: ScoresByUser) {
//   const userIdToNameMap = {} as { [userId: string]: string };
//   for (const userId in allUserTotals) {
//     userIdToNameMap[userId] = allUserTotals[userId].details[0].username;
//   }
//   return userIdToNameMap;
// }
interface GenerateHtmlParams {
  permit: URL;
  tokenAmount: Decimal;
  tokenSymbol: string;
  contributorName: string;
  detailsTable: string;
  issueRole: ContributorClassNames;
}

// const ee = new EventEmitter();
// ee.on("ok", ({ message }: { message: string }) => console.log(message));
// ee.emit("ok", { message: "ok" });
