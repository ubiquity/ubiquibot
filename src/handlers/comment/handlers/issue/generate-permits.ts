import Decimal from "decimal.js";
import { stringify } from "yaml";

import Runtime from "../../../../bindings/bot-runtime";
import { getTokenSymbol } from "../../../../helpers/contracts";
import { Context } from "../../../../types";
import structuredMetadata from "../../../shared/structured-metadata";
import { generatePermit2Signature } from "./generate-permit-2-signature";
import { UserScoreTotals } from "./issue-shared-types";

type TotalsById = { [userId: string]: UserScoreTotals };

export async function generatePermits(context: Context, totals: TotalsById) {
  // const userIdToNameMap = mapIdsToNames(totals);

  const { html: comment, permits } = await generateComment(context, totals);
  const metadata = structuredMetadata.create("Permits", { permits, totals });
  return comment.concat("\n", metadata);
}

async function generateComment(context: Context, totals: TotalsById) {
  const runtime = Runtime.getState();
  const {
    payout: { paymentToken, rpc, privateKey },
  } = context.config;
  const contributionsOverviewTable = generateContributionsOverview(totals);
  const conversationIncentivesTable = generateDetailsTable(totals);
  const tokenSymbol = await getTokenSymbol(paymentToken, rpc);
  const HTMLs = [] as string[];

  const permits = [];

  for (const userId in totals) {
    const userTotals = totals[userId];

    const tokenAmount = userTotals.total;

    const contributorName = userTotals.user.login;
    // const contributionClassName = userTotals.details[0].contribution as ContributorClassNames;

    if (!privateKey) throw runtime.logger.warn("No bot wallet private key defined");

    const beneficiaryAddress = await runtime.adapters.supabase.wallet.getAddress(parseInt(userId));

    const permit = await generatePermit2Signature(context, {
      beneficiary: beneficiaryAddress,
      amount: tokenAmount,
      userId: userId,
    });

    permits.push(permit);

    const html = generateHtml({
      permit: permit.url,
      tokenAmount,
      tokenSymbol,
      contributorName,
      contributionsOverviewTable,
      detailsTable: conversationIncentivesTable,
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
  contributionsOverviewTable,
  detailsTable,
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
        <h6>@${contributorName}</h6></b
      >
    </summary>
    ${contributionsOverviewTable}
    ${detailsTable}
  </details>
  `;
}

function generateContributionsOverview(userScoreDetails: TotalsById) {
  const buffer = [
    "<h6>Contributions Overview</h6>",
    "<table><thead>",
    "<tr><th>View</th><th>Contribution</th><th>Count</th><th>Reward</th>",
    "</thead><tbody>",
  ];

  const newRow = (view: string, contribution: string, count: string, reward: string) =>
    `<tr><td>${view}</td><td>${contribution}</td><td>${count}</td><td>${reward}</td></tr>`;

  for (const entries of Object.entries(userScoreDetails)) {
    const userId = Number(entries[0]);
    const userScore = entries[1];
    for (const detail of userScore.details) {
      const { specification, issueComments, reviewComments, task } = detail.scoring;

      if (specification) {
        buffer.push(
          newRow(
            "Issue",
            "Specification",
            specification?.length.toString() || "-",
            specification?.commentScores[userId].totalScoreTotal.toString() || "-"
          )
        );
      }
      if (issueComments) {
        buffer.push(
          newRow(
            "Issue",
            "Comment",
            issueComments?.length.toString() || "-",
            issueComments?.commentScores[userId].totalScoreTotal.toString() || "-"
          )
        );
      }
      if (reviewComments) {
        buffer.push(
          newRow(
            "Review",
            "Comment",
            reviewComments?.length.toString() || "-",
            reviewComments?.commentScores[userId].totalScoreTotal.toString() || "-"
          )
        );
      }
      if (task) {
        buffer.push(newRow("Issue", "Task", task?.toString() || "-", task?.toString() || "-"));
      }
    }
  }
  /**
   * Example
   *
   * Contributions Overview
   * | View | Contribution | Count | Reward |
   * | --- | --- | --- | --- |
   * | Issue | Specification | 1 | 1 |
   * | Issue | Comment | 6 | 1 |
   * | Review | Comment | 4 | 1 |
   * | Review | Approval | 1 | 1 |
   * | Review | Rejection | 3 | 1 |
   */
  buffer.push("</tbody></table>");
  return buffer.join("\n");
}

function generateDetailsTable(totals: TotalsById) {
  let tableRows = "";

  for (const user of Object.values(totals)) {
    for (const detail of user.details) {
      const userId = detail.source.user.id;

      const commentSources = [];
      const specificationComments = detail.scoring.specification?.commentScores[userId].details;
      const issueComments = detail.scoring.issueComments?.commentScores[userId].details;
      const reviewComments = detail.scoring.reviewComments?.commentScores[userId].details;
      if (specificationComments) commentSources.push(...specificationComments);
      if (issueComments) commentSources.push(...issueComments);
      if (reviewComments) commentSources.push(...reviewComments);

      const commentScores = [];
      const specificationCommentScores = detail.scoring.specification?.commentScores[userId].details;
      const issueCommentScores = detail.scoring.issueComments?.commentScores[userId].details;
      const reviewCommentScores = detail.scoring.reviewComments?.commentScores[userId].details;
      if (specificationCommentScores) commentScores.push(...specificationCommentScores);
      if (issueCommentScores) commentScores.push(...issueCommentScores);
      if (reviewCommentScores) commentScores.push(...reviewCommentScores);

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
  contributionsOverviewTable: string;
  detailsTable: string;
}
