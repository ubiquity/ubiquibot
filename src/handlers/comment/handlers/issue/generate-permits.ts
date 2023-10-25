import Decimal from "decimal.js";
import { stringify } from "yaml";
import Runtime from "../../../../bindings/bot-runtime";
import { getTokenSymbol } from "../../../../helpers/contracts";
import { Comment } from "../../../../types";
import { generatePermit2Signature } from "./generate-permit-2-signature";
import { FinalScores } from "./issue-closed";
import { IssueRole } from "./_calculate-all-comment-scores";
import { ethers } from "ethers";

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
  const tokenSymbol = await getTokenSymbol(runtime.botConfig.payout.paymentToken, runtime.botConfig.payout.rpc);
  const HTMLs = [] as string[];
  for (const userId in totals) {
    const userTotals = totals[userId];

    const tokenAmount = userTotals.total;
    const contributorName = userIdToNameMap[userId];
    const issueRole = userTotals.role;

    const key = runtime.botConfig.payout.privateKey;
    if (!key) throw runtime.logger.warn("No bot wallet private key defined");
    // const spenderAddress = new ethers.Wallet(runtime.botConfig.payout.privateKey as string).address;

    const beneficiaryAddress = await runtime.adapters.supabase.wallet.getAddress(parseInt(userId));

    const permit = await generatePermit2Signature({
      beneficiary: beneficiaryAddress,
      amount: tokenAmount,
      identifier: issueRole,
      userId: userId,
    });

    const html = generateHtml({
      permit: permit.url,
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
      const quantScore = zeroToHyphen(commentScore.wordAndElementScoreTotal);
      const qualScore = zeroToHyphen(commentScore.qualityScore);
      const credit = zeroToHyphen(commentScore.finalScore);

      tableRows += `<tr><td><h6><a href="${commentUrl}">${truncatedBody}</a></h6></td><td>${quantScore}</td><td>${qualScore}</td><td>${credit}</td><td>${elementScoreDetailsStr}</td></tr>`;
    }
  }
  return `<table><tbody><tr><td>Comment</td><td>Formatting</td><td>Relevance</td><td>Reward</td><td>Formatting Stats</td></tr>${tableRows}</tbody></table>`;
}

function zeroToHyphen(value: number | Decimal) {
  if (value instanceof Decimal ? value.isZero() : value === 0) {
    return "-";
  } else {
    return value.toString();
  }
}

function mapIdsToNames(contributorComments: Comment[]) {
  return contributorComments.reduce((accumulator, comment: Comment) => {
    const userId = comment.user.id;
    accumulator[userId] = comment.user.login;
    return accumulator;
  }, {} as { [userId: number]: string });
}
interface GenerateHtmlParams {
  permit: URL;
  tokenAmount: Decimal;
  tokenSymbol: string;
  contributorName: string;
  detailsTable: string;
  issueRole: IssueRole;
}
