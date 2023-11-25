import Decimal from "decimal.js";
import { stringify } from "yaml";

import Runtime from "../../../../bindings/bot-runtime";
import { getPayoutConfigByNetworkId } from "../../../../helpers";
import { getTokenSymbol } from "../../../../helpers/contracts";
import { Context } from "../../../../types/context";
import { Issue, Payload } from "../../../../types/payload";

import structuredMetadata from "../../../shared/structured-metadata";
import { generatePermit2Signature } from "./generate-permit-2-signature";
import { UserScoreTotals } from "./issue-shared-types";

type TotalsById = { [userId: string]: UserScoreTotals };

export async function generatePermits(context: Context, totals: TotalsById) {
  const { html: comment, permits } = await generateComment(context, totals);
  const metadata = structuredMetadata.create("Permits", { permits, totals });
  return comment.concat("\n", metadata);
}

async function generateComment(context: Context, totals: TotalsById) {
  const runtime = Runtime.getState();
  const {
    keys: { evmPrivateEncrypted },
  } = context.config;
  const payload = context.event.payload as Payload;
  const issue = payload.issue as Issue;
  const { rpc, paymentToken } = getPayoutConfigByNetworkId(context.config.payments.evmNetworkId);

  const tokenSymbol = await getTokenSymbol(paymentToken, rpc);
  const HTML = [] as string[];

  const permits = [];

  for (const userId in totals) {
    const userTotals = totals[userId];
    const contributionsOverviewTable = generateContributionsOverview({ [userId]: userTotals }, issue);
    const conversationIncentivesTable = generateDetailsTable({ [userId]: userTotals });

    const tokenAmount = userTotals.total;

    const contributorName = userTotals.user.login;
    // const contributionClassName = userTotals.details[0].contribution as ContributorClassNames;

    if (!evmPrivateEncrypted) throw context.logger.warn("No bot wallet private key defined");

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
    HTML.push(html);
  }
  return { html: HTML.join("\n"), permits };
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

function generateContributionsOverview(userScoreDetails: TotalsById, issue: Issue) {
  const buffer = [
    "<h6>Contributions Overview</h6>",
    "<table><thead>",
    "<tr><th>View</th><th>Contribution</th><th>Count</th><th>Reward</th>",
    "</thead><tbody>",
  ];

  function newRow(view: string, contribution: string, count: string, reward: string) {
    return `<tr><td>${view}</td><td>${contribution}</td><td>${count}</td><td>${reward}</td></tr>`;
  }

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
            Object.keys(specification.commentScores[userId].details).length.toString() || "-",
            specification.commentScores[userId].totalScoreTotal.toString() || "-"
          )
        );
      }
      if (issueComments) {
        buffer.push(
          newRow(
            "Issue",
            "Comment",
            Object.keys(issueComments.commentScores[userId].details).length.toString() || "-",
            issueComments.commentScores[userId].totalScoreTotal.toString() || "-"
          )
        );
      }
      if (reviewComments) {
        buffer.push(
          newRow(
            "Review",
            "Comment",
            Object.keys(reviewComments.commentScores[userId].details).length.toString() || "-",
            reviewComments.commentScores[userId].totalScoreTotal.toString() || "-"
          )
        );
      }
      if (task) {
        buffer.push(
          newRow(
            "Issue",
            "Task",
            issue.assignees.length === 0 ? "-" : `${(1 / issue.assignees.length).toFixed(2)}`,
            task?.toString() || "-"
          )
        );
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
      if (specificationComments) commentSources.push(...Object.values(specificationComments));
      if (issueComments) commentSources.push(...Object.values(issueComments));
      if (reviewComments) commentSources.push(...Object.values(reviewComments));

      const commentScores = [];
      const specificationCommentScores = detail.scoring.specification?.commentScores[userId].details;
      const issueCommentScores = detail.scoring.issueComments?.commentScores[userId].details;
      const reviewCommentScores = detail.scoring.reviewComments?.commentScores[userId].details;
      if (specificationCommentScores) commentScores.push(...Object.values(specificationCommentScores));
      if (issueCommentScores) commentScores.push(...Object.values(issueCommentScores));
      if (reviewCommentScores) commentScores.push(...Object.values(reviewCommentScores));

      if (!commentSources) continue;
      if (!commentScores) continue;

      for (const index in commentSources) {
        //
        const commentSource = commentSources[index];
        const commentScore = commentScores[index];

        const commentUrl = commentSource.comment.html_url;
        const truncatedBody = commentSource ? commentSource.comment.body.substring(0, 64).concat("...") : "";
        const formatScoreDetails = commentScore.formatScoreCommentDetails;

        let formatDetailsStr = "";
        if (formatScoreDetails && Object.keys(formatScoreDetails).length > 0) {
          const ymlElementScores = stringify(formatScoreDetails);
          formatDetailsStr = ["", `<pre>${ymlElementScores}</pre>`, ""].join("\n"); // weird rendering quirk with pre that needs breaks
        } else {
          formatDetailsStr = "-";
        }

        const formatScore = zeroToHyphen(commentScore.wordScoreComment.plus(commentScore.formatScoreComment));
        const relevanceScore = zeroToHyphen(commentScore.relevanceScoreComment);
        const totalScore = zeroToHyphen(commentScore.totalScoreComment);
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
  if (tableRows === "") return "";
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
