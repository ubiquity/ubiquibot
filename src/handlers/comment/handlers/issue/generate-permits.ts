import Decimal from "decimal.js";
import { stringify } from "yaml";

import Runtime from "../../../../bindings/bot-runtime";
import { getTokenSymbol } from "../../../../helpers/contracts";
import { Context } from "../../../../types";
import structuredMetadata from "../../../shared/structured-metadata";
import { FormatScoreDetails, Tags } from "./comment-scoring-rubric";
import { generatePermit2Signature } from "./generate-permit-2-signature";
import { ScoresByUser } from "./issue-shared-types";
import { ContributorClassNames } from "./specification-scoring";

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

        let formatDetailsStr = "";
        if (formatScoreDetails && Object.keys(formatScoreDetails).length > 0) {
          const ymlElementScores = stringify(formatScoreDetails);
          formatDetailsStr = ["", `<pre>${ymlElementScores}</pre>`, ""].join("\n"); // weird rendering quirk with pre that needs breaks
        } else {
          formatDetailsStr = "-";
        }

        const formatScore = zeroToHyphen(commentScore.wordScore.plus(commentScore.formattingScore));
        const relevanceScore = zeroToHyphen(commentScore.relevanceScore);
        const totalScore = zeroToHyphen(commentScore.finalScore);
        let formatScoreCell;
        if (formatDetailsStr != "-") {
          formatScoreCell = `<details><summary>${formatScore}</summary>${formatDetailsStr}</details>`;
        } else {
          formatScoreCell = formatScore;
        }
        tableRows += `<tr><td><h6><a href="${commentUrl}">${truncatedBody}</a></h6></td><td>${formatScoreCell}</td><td>${relevanceScore}</td><td>${totalScore}</td></tr>`;
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

interface GenerateHtmlParams {
  permit: URL;
  tokenAmount: Decimal;
  tokenSymbol: string;
  contributorName: string;
  detailsTable: string;
  issueRole: ContributorClassNames;
}
