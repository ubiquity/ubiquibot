import Decimal from "decimal.js";
import { stringify } from "yaml";
import Runtime from "../../../../bindings/bot-runtime";
import { getTokenSymbol } from "../../../../helpers/contracts";
import { Comment } from "../../../../types";
import { FinalScores } from "./issue-closed";
import { IssueRole } from "./_calculate-all-comment-scores";

export async function generatePermits(totals: FinalScores, contributorComments: Comment[]) {
  const runtime = Runtime.getState();
  const userIdToNameMap = mapIdsToNames(contributorComments);
  const comments = await generateComments(runtime, totals, userIdToNameMap, contributorComments);
  return comments;
}

async function generateComments(
  runtime: Runtime,
  totals: FinalScores,
  userIdToNameMap: { [userId: number]: string },
  contributorComments: Comment[]
) {
  const detailsTable = generateDetailsTable(totals, contributorComments);
  const evmNetworkId = runtime.botConfig.payout.evmNetworkId;
  const tokenSymbol = await getTokenSymbol(runtime.botConfig.payout.paymentToken, runtime.botConfig.payout.rpc);
  const HTMLs = [] as string[];
  for (const userId in totals) {
    const userTotals = totals[userId];
    const base64Permit = "xxx";
    const tokenAmount = userTotals.total;
    const contributorName = userIdToNameMap[userId];
    const issueRole = userTotals.role;
    const html = generateHtml({
      base64Permit,
      evmNetworkId,
      tokenAmount,
      tokenSymbol,
      contributorName,
      detailsTable,
      issueRole,
    });
    HTMLs.push(html);
  }
  return HTMLs.join();
}
function generateHtml({
  base64Permit,
  evmNetworkId,
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
            href="https://pay.ubq.fi/?claim=${base64Permit}&network=${evmNetworkId}"
          >
            [ ${tokenAmount} ${tokenSymbol} ]</a
          >
        </h3>
        <h6>&nbsp;${issueRole}&nbsp;@${contributorName}</h6></b
      >
    </summary>
    ${detailsTable}
  </details>
  `;
}

function generateDetailsTable(totals: FinalScores, contributorComments: Comment[]) {
  let tableRows = "";
  for (const userId in totals) {
    const userTotals = totals[userId];
    for (const commentScore of userTotals.comments) {
      const comment = contributorComments.find((comment) => comment.id === commentScore.commentId) as Comment;
      const commentUrl = comment.html_url;
      const truncatedBody = comment ? comment.body.substring(0, 32).concat("...") : "";

      const elementScoreDetails = commentScore.elementScoreDetails;

      const newElementScoreDetails = {} as { [elementId: string]: { count: number; score: number; words: number } };
      for (const key in elementScoreDetails) {
        newElementScoreDetails[key] = {
          ...elementScoreDetails[key],
          score: Number(elementScoreDetails[key].score),
        };
      }

      let elementScoreDetailsStr = "";
      if (newElementScoreDetails && Object.keys(newElementScoreDetails).length > 0) {
        const ymlElementScores = stringify(newElementScoreDetails);
        elementScoreDetailsStr = ["", `<pre>${ymlElementScores}</pre>`, ""].join("\n"); // weird rendering quirk with pre that needs breaks
      } else {
        elementScoreDetailsStr = "-";
      }
      const quantScore = commentScore.wordAndElementScoreTotal;
      const qualScore = commentScore.qualityScore;
      const credit = commentScore.finalScore;

      tableRows += `<tr><td><h6><a href="${commentUrl}">${truncatedBody}</a></h6></td><td>${quantScore}</td><td>${qualScore}</td><td>${credit}</td><td>${elementScoreDetailsStr}</td></tr>`;
    }
  }
  return `<table><tbody><tr><td>Comment</td><td>QuantScore</td><td>QualScore</td><td>Credit</td><td>Element Score Details</td></tr>${tableRows}</tbody></table>`;
}

function mapIdsToNames(contributorComments: Comment[]) {
  return contributorComments.reduce((accumulator, comment: Comment) => {
    const userId = comment.user.id;
    accumulator[userId] = comment.user.login;
    return accumulator;
  }, {} as { [userId: number]: string });
}
interface GenerateHtmlParams {
  base64Permit: string;
  evmNetworkId: number;
  tokenAmount: Decimal;
  tokenSymbol: string;
  contributorName: string;
  detailsTable: string;
  issueRole: IssueRole;
}
