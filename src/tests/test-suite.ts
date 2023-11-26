import { expect, test } from "@jest/globals";
import { Issue } from "../types/payload";
import {
  GIT_COMMIT_HASH,
  owner,
  repo,
  SIX_HOURS,
  // TEST_PRIORITY_LABEL,
  // TEST_TIME_LABEL,
  getAdminUsername,
  // getCollaboratorUsername,
  getAdminUser,
  // getCollaboratorUser,
} from "./commands-test";
import checkLastComment, {
  createComment,
  // createLabel,
  getLastComment,
  // removeLabelFromIssue,
  waitForNWebhooks,
} from "./utils";

let issue: Issue;

export function testSuite(): () => void {
  beforeAll(createAndAlwaysUseThisTestIssue(), SIX_HOURS);

  return allTests();
}

function createAndAlwaysUseThisTestIssue(): jest.ProvidesHookCallback {
  return async () => {
    const res = await getAdminUser().rest.issues.create({
      repo,
      owner,
      title: `${GIT_COMMIT_HASH} - E2E TEST`,
    });
    issue = res.data as Issue;

    await waitForNWebhooks(4);
  };
}

function allTests(): () => void {
  return () => {
    test(
      "/wallet correct address",
      async () => {
        const newWallet = "0x82AcFE58e0a6bE7100874831aBC56Ee13e2149e7";
        await createComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          body: `/wallet ${newWallet}`,
        });
        await waitForNWebhooks(2);
        await checkLastComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          expectedComment: `Updated the wallet address for @${getAdminUsername()} successfully!\t Your new address: \`${newWallet}\``,
        });
      },
      SIX_HOURS
    );

    test(
      "/wallet wrong address",
      async () => {
        const newWallet = "0x82AcFE58e0a6bE7100874831aBC56";
        await createComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          body: `/wallet ${newWallet}`,
        });
        await waitForNWebhooks(2);
        await checkLastComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          expectedComment: `Please include your wallet or ENS address.\n usage: /wallet 0x0000000000000000000000000000000000000000`,
        });
      },
      SIX_HOURS
    );

    test(
      "/multiplier",
      async () => {
        await createComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          body: `/multiplier @${getAdminUsername()}`,
        });
        await waitForNWebhooks(2);

        await checkLastComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          expectedComment: `Successfully changed the payout multiplier for @${getAdminUsername()} to 1. The reason is not provided.`,
        });

        await createComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          body: `/multiplier @${getAdminUsername()} 2`,
        });
        await waitForNWebhooks(2);

        await checkLastComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          expectedComment: `Successfully changed the payout multiplier for @${getAdminUsername()} to 2. The reason is not provided. This feature is designed to limit the contributor's compensation for any task on the current repository due to other compensation structures (i.e. salary.) are you sure you want to use a price multiplier above 1?`,
        });

        await createComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          body: `/multiplier @${getAdminUsername()} 2 "Testing reason"`,
        });
        await waitForNWebhooks(2);

        await checkLastComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          expectedComment: `Successfully changed the payout multiplier for @${getAdminUsername()} to 2. The reason provided is "Testing reason". This feature is designed to limit the contributor's compensation for any task on the current repository due to other compensation structures (i.e. salary.) are you sure you want to use a price multiplier above 1?`,
        });

        await createComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          body: `/multiplier @${getAdminUsername()} abcd`,
        });
        await waitForNWebhooks(2);

        await checkLastComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          expectedComment: `Successfully changed the payout multiplier for @${getAdminUsername()} to 1. The reason provided is "abcd".`,
        });

        await createComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          body: `/multiplier abcd`,
        });
        await waitForNWebhooks(2);

        await checkLastComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          expectedComment: `Successfully changed the payout multiplier for @${getAdminUsername()} to 1. The reason provided is "abcd".`,
        });
      },
      SIX_HOURS
    );

    test(
      "/query",
      async () => {
        const newWallet = "0x82AcFE58e0a6bE7100874831aBC56Ee13e2149e7";
        await createComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          body: `/wallet ${newWallet}`,
        });
        await waitForNWebhooks(2);

        const multiplier = "5";
        await createComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          body: `/multiplier @${getAdminUsername()} ${multiplier} 'Testing'`,
        });
        await waitForNWebhooks(2);

        await createComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          body: `/query @${getAdminUsername()}`,
        });
        await waitForNWebhooks(2);

        const lastComment = await getLastComment({ octokit: getAdminUser(), owner, repo, issueNumber: issue.number });
        expect(lastComment.body).toContain(
          `@${getAdminUsername()}'s wallet address is ${newWallet}, multiplier is ${multiplier}`
        );
      },
      SIX_HOURS
    );

    test(
      "/query wrong username",
      async () => {
        await createComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          body: `/query @INVALID_$USERNAME`,
        });
        await waitForNWebhooks(2);

        await checkLastComment({
          octokit: getAdminUser(),
          owner,
          repo,
          issueNumber: issue.number,
          expectedComment: `Invalid syntax for query command \n usage /query @user`,
        });
      },
      SIX_HOURS
    );

    test(
      "/help",
      async () => {
        await createComment({ octokit: getAdminUser(), owner, repo, issueNumber: issue.number, body: `/help` });
        await waitForNWebhooks(2);

        const lastComment = await getLastComment({ octokit: getAdminUser(), owner, repo, issueNumber: issue.number });
        expect(lastComment.body?.includes("Available Commands")).toBe(true);
      },
      SIX_HOURS
    );

    // test(
    //   "/labels",
    //   async () => {
    //     await createLabel(getAdminUser(), owner, repo, TEST_PRIORITY_LABEL);

    //     await getAdminUser().rest.issues.update({
    //       owner,
    //       repo,
    //       issue_number: issue.number,
    //       labels: [],
    //     });

    //     await createComment(getAdminUser(), owner, repo, issue.number, `/labels set-priority @${getCollaboratorUsername()} false`);
    //     await waitForNWebhooks(2);

    //     let lastComment = await getLastComment(getAdminUser(), owner, repo, issue.number);
    //     expect(lastComment.body).toContain(`Updated access for @${getCollaboratorUsername()} successfully!\t Access: **priority** for "${owner}/${repo}"`);

    //     // collaborator adds label
    //     await addLabelToIssue(getCollaboratorUser(), owner, repo, issue.number, TEST_PRIORITY_LABEL);
    //     await waitForNWebhooks(3);

    //     let issueDetails = await getAdminUser().rest.issues.get({
    //       owner,
    //       repo,
    //       issue_number: issue.number,
    //     });
    //     expect(issueDetails.data.labels?.length).toBe(0);

    //     lastComment = await getLastComment(getAdminUser(), owner, repo, issue.number);
    //     expect(lastComment.body).toContain(`@${getCollaboratorUsername()}, You are not allowed to add Priority: 1 (Normal)`);

    //     await getAdminUser().rest.issues.update({
    //       owner,
    //       repo,
    //       issue_number: issue.number,
    //       labels: [TEST_PRIORITY_LABEL],
    //     });

    //     await removeLabelFromIssue(getCollaboratorUser(), owner, repo, issue.number, TEST_PRIORITY_LABEL);
    //     await waitForNWebhooks(3);

    //     issueDetails = await getAdminUser().rest.issues.get({
    //       owner,
    //       repo,
    //       issue_number: issue.number,
    //     });
    //     expect(issueDetails.data.labels?.length).toBe(1);

    //     lastComment = await getLastComment(getAdminUser(), owner, repo, issue.number);
    //     expect(lastComment.body).toContain(`@${getCollaboratorUsername()}, You are not allowed to remove Priority: 1 (Normal)`);

    //     await createComment(getAdminUser(), owner, repo, issue.number, `/labels set-priority @${getCollaboratorUsername()} true`);
    //     await waitForNWebhooks(2);

    //     lastComment = await getLastComment(getAdminUser(), owner, repo, issue.number);
    //     expect(lastComment.body).toContain(`Updated access for @${getCollaboratorUsername()} successfully!\t Access: **priority** for "${owner}/${repo}"`);

    //     await removeLabelFromIssue(getCollaboratorUser(), owner, repo, issue.number, TEST_PRIORITY_LABEL);
    //     await waitForNWebhooks(1);

    //     issueDetails = await getAdminUser().rest.issues.get({
    //       owner,
    //       repo,
    //       issue_number: issue.number,
    //     });
    //     expect(issueDetails.data.labels?.length).toBe(0);

    //     await addLabelToIssue(getCollaboratorUser(), owner, repo, issue.number, TEST_PRIORITY_LABEL);
    //     await waitForNWebhooks(1);

    //     issueDetails = await getAdminUser().rest.issues.get({
    //       owner,
    //       repo,
    //       issue_number: issue.number,
    //     });
    //     expect(issueDetails.data.labels?.length).toBe(1);
    //   },
    //   SIX_HOURS
    // );

    // test(
    //   "/start and /stop",
    //   async () => {
    //     await getAdminUser().rest.issues.update({
    //       owner,
    //       repo,
    //       issue_number: issue.number,
    //       labels: [],
    //     });

    //     await getAdminUser().rest.issues.update({
    //       owner,
    //       repo,
    //       issue_number: issue.number,
    //       state: "closed",
    //     });
    //     await waitForNWebhooks(2);

    //     let lastComment = await getLastComment(getAdminUser(), owner, repo, issue.number);
    //     expect(lastComment.body).toContain("Permit generation disabled because this issue didn't qualify for funding");

    //     await getAdminUser().rest.issues.update({
    //       owner,
    //       repo,
    //       issue_number: issue.number,
    //       state: "open",
    //     });
    //     await waitForNWebhooks(1);

    //     try {
    //       await getAdminUser().rest.issues.createLabel({
    //         owner,
    //         repo,
    //         name: TEST_TIME_LABEL,
    //       });
    //     } catch (err) {
    //       expect(err).toBeDefined();
    //     } finally {
    //       await getAdminUser().rest.issues.addLabels({
    //         owner,
    //         repo,
    //         issue_number: issue.number,
    //         labels: [TEST_TIME_LABEL],
    //       });
    //       await waitForNWebhooks(1);
    //     }

    //     try {
    //       await getAdminUser().rest.issues.createLabel({
    //         owner,
    //         repo,
    //         name: TEST_PRIORITY_LABEL,
    //       });
    //     } catch (err) {
    //       expect(err).toBeDefined();
    //     } finally {
    //       await getAdminUser().rest.issues.addLabels({
    //         owner,
    //         repo,
    //         issue_number: issue.number,
    //         labels: [TEST_PRIORITY_LABEL],
    //       });
    //       await waitForNWebhooks(2);
    //     }

    //     await getAdminUser().rest.issues.update({
    //       owner,
    //       repo,
    //       issue_number: issue.number,
    //       state: "closed",
    //     });
    //     await waitForNWebhooks(2);

    //     lastComment = await getLastComment(getAdminUser(), owner, repo, issue.number);
    //     expect(lastComment.body).toContain("Permit generation disabled because assignee is undefined");

    //     await getAdminUser().rest.issues.update({
    //       owner,
    //       repo,
    //       issue_number: issue.number,
    //       state: "open",
    //     });
    //     await waitForNWebhooks(1);

    //     await createComment(getAdminUser(), owner, repo, issue.number, `/autopay false`);
    //     await waitForNWebhooks(2);

    //     lastComment = await getLastComment(getAdminUser(), owner, repo, issue.number);
    //     expect(lastComment.body).toContain("Automatic payment for this issue is enabled: **false**");

    //     await createComment(getAdminUser(), owner, repo, issue.number, '/start');
    //     await waitForNWebhooks(3);

    //     lastComment = await getLastComment(getAdminUser(), owner, repo, issue.number);
    //     const lastCommentBody = lastComment.body?.toLowerCase();
    //     expect(lastCommentBody).toContain("deadline");
    //     expect(lastCommentBody).toContain("registered wallet");
    //     expect(lastCommentBody).toContain("payment multiplier");
    //     expect(lastCommentBody).toContain("multiplier reason");

    //     await createComment(getAdminUser(), owner, repo, issue.number, `/stop`);
    //     await waitForNWebhooks(3);

    //     lastComment = await getLastComment(getAdminUser(), owner, repo, issue.number);
    //     expect(lastComment.body).toBe(`You have been unassigned from the task @${getAdminUsername()}`);

    //     await createComment(getAdminUser(), owner, repo, issue.number, '/start');
    //     await waitForNWebhooks(3);

    //     await getAdminUser().rest.issues.update({
    //       owner,
    //       repo,
    //       issue_number: issue.number,
    //       state: "closed",
    //     });
    //     await waitForNWebhooks(2);

    //     lastComment = await getLastComment(getAdminUser(), owner, repo, issue.number);
    //     expect(lastComment.body).toContain("Permit generation disabled because automatic payment for this issue is disabled.");

    //     await getAdminUser().rest.issues.update({
    //       owner,
    //       repo,
    //       issue_number: issue.number,
    //       state: "open",
    //     });
    //     await waitForNWebhooks(1);

    //     await createComment(getAdminUser(), owner, repo, issue.number, `/autopay true`);
    //     await waitForNWebhooks(2);

    //     lastComment = await getLastComment(getAdminUser(), owner, repo, issue.number);
    //     expect(lastComment.body).toBe("Automatic payment for this issue is enabled: **true**");

    //     await getAdminUser().rest.issues.update({
    //       owner,
    //       repo,
    //       issue_number: issue.number,
    //       state: "closed",
    //       state_reason: "not_planned",
    //     });
    //     await waitForNWebhooks(2);

    //     lastComment = await getLastComment(getAdminUser(), owner, repo, issue.number);
    //     expect(lastComment.body).toContain("Permit generation disabled because this is marked as unplanned");

    //     await getAdminUser().rest.issues.update({
    //       owner,
    //       repo,
    //       issue_number: issue.number,
    //       state: "open",
    //     });
    //     await waitForNWebhooks(1);

    //     await getAdminUser().rest.issues.update({
    //       owner,
    //       repo,
    //       issue_number: issue.number,
    //       state: "closed",
    //     });
    //     await waitForNWebhooks(2);

    //     lastComment = await getLastComment(getAdminUser(), owner, repo, issue.number);
    //     expect(lastComment.body).toContain("Task Assignee Reward");
    //   },
    //   SIX_HOURS
    // );
  };
}
