import { expect, test } from "@jest/globals";
import { Issue } from "../src/types";
import {
  DATE_NOW,
  owner,
  repo,
  SIX_HOURS,
  TEST_PRIORITY_LABEL,
  TEST_TIME_LABEL,
  getAdminUsername,
  getCollaboratorUsername,
  getOctokitAdmin,
  getOctokitCollaborator,
} from "./commands.test";
import { addLabelToIssue, checkLastComment, createComment, createLabel, getLastComment, removeLabelFromIssue, waitForNWebhooks } from "./utils";

export function testSuite(): () => void {
  return () => {
    let issue: Issue;

    // const getAdminUsername() = getAdminUsername();
    // const getCollaboratorUsername() = getCollaboratorUsername();
    // const getOctokitAdmin() = getOctokitAdmin();
    // const getOctokitCollaborator() = getOctokitCollaborator();

    beforeAll(async () => {
      const res = await getOctokitAdmin().rest.issues.create({
        repo,
        owner,
        title: `${DATE_NOW} - E2E TEST`,
      });
      issue = res.data as Issue;

      await waitForNWebhooks(4);
    }, SIX_HOURS);

    test(
      "/wallet correct address",
      async () => {
        const newWallet = "0x82AcFE58e0a6bE7100874831aBC56Ee13e2149e7";
        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/wallet ${newWallet}`);
        await waitForNWebhooks(2);
        await checkLastComment(
          getOctokitAdmin(),
          owner,
          repo,
          issue.number,
          `Updated the wallet address for @${getAdminUsername()} successfully!\t Your new address: \`${newWallet}\``
        );
      },
      SIX_HOURS
    );

    test(
      "/wallet wrong address",
      async () => {
        const newWallet = "0x82AcFE58e0a6bE7100874831aBC56";
        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/wallet ${newWallet}`);
        await waitForNWebhooks(2);
        await checkLastComment(
          getOctokitAdmin(),
          owner,
          repo,
          issue.number,
          `Please include your wallet or ENS address.\n usage: /wallet 0x0000000000000000000000000000000000000000`
        );
      },
      SIX_HOURS
    );

    test(
      "/multiplier",
      async () => {
        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/multiplier @${getAdminUsername()}`);
        await waitForNWebhooks(2);

        await checkLastComment(
          getOctokitAdmin(),
          owner,
          repo,
          issue.number,
          `Successfully changed the payout multiplier for @${getAdminUsername()} to 1. The reason is not provided.`
        );

        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/multiplier @${getAdminUsername()} 2`);
        await waitForNWebhooks(2);

        await checkLastComment(
          getOctokitAdmin(),
          owner,
          repo,
          issue.number,
          `Successfully changed the payout multiplier for @${getAdminUsername()} to 2. The reason is not provided. This feature is designed to limit the contributor's compensation for any task on the current repository due to other compensation structures (i.e. salary.) are you sure you want to use a price multiplier above 1?`
        );

        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/multiplier @${getAdminUsername()} 2 "Testing reason"`);
        await waitForNWebhooks(2);

        await checkLastComment(
          getOctokitAdmin(),
          owner,
          repo,
          issue.number,
          `Successfully changed the payout multiplier for @${getAdminUsername()} to 2. The reason provided is "Testing reason". This feature is designed to limit the contributor's compensation for any task on the current repository due to other compensation structures (i.e. salary.) are you sure you want to use a price multiplier above 1?`
        );

        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/multiplier @${getAdminUsername()} abcd`);
        await waitForNWebhooks(2);

        await checkLastComment(
          getOctokitAdmin(),
          owner,
          repo,
          issue.number,
          `Successfully changed the payout multiplier for @${getAdminUsername()} to 1. The reason provided is "abcd".`
        );

        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/multiplier abcd`);
        await waitForNWebhooks(2);

        await checkLastComment(
          getOctokitAdmin(),
          owner,
          repo,
          issue.number,
          `Successfully changed the payout multiplier for @${getAdminUsername()} to 1. The reason provided is "abcd".`
        );
      },
      SIX_HOURS
    );

    test(
      "/query",
      async () => {
        const newWallet = "0x82AcFE58e0a6bE7100874831aBC56Ee13e2149e7";
        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/wallet ${newWallet}`);
        await waitForNWebhooks(2);

        const multiplier = "5";
        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/multiplier @${getAdminUsername()} ${multiplier} 'Testing'`);
        await waitForNWebhooks(2);

        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/query @${getAdminUsername()}`);
        await waitForNWebhooks(2);

        const lastComment = await getLastComment(getOctokitAdmin(), owner, repo, issue.number);
        expect(lastComment.body).toContain(`@${getAdminUsername()}'s wallet address is ${newWallet}, multiplier is ${multiplier}`);
      },
      SIX_HOURS
    );

    test(
      "/query wrong username",
      async () => {
        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/query @INVALID_$USERNAME`);
        await waitForNWebhooks(2);

        await checkLastComment(getOctokitAdmin(), owner, repo, issue.number, `Invalid syntax for query command \n usage /query @user`);
      },
      SIX_HOURS
    );

    test(
      "/help",
      async () => {
        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/help`);
        await waitForNWebhooks(2);

        const lastComment = await getLastComment(getOctokitAdmin(), owner, repo, issue.number);
        expect(lastComment.body?.includes("Available Commands")).toBe(true);
      },
      SIX_HOURS
    );

    test(
      "/allow",
      async () => {
        await createLabel(getOctokitAdmin(), owner, repo, TEST_PRIORITY_LABEL);

        await getOctokitAdmin().rest.issues.update({
          owner,
          repo,
          issue_number: issue.number,
          labels: [],
        });

        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/allow set-priority @${getCollaboratorUsername()} false`);
        await waitForNWebhooks(2);

        let lastComment = await getLastComment(getOctokitAdmin(), owner, repo, issue.number);
        expect(lastComment.body).toContain(`Updated access for @${getCollaboratorUsername()} successfully!\t Access: **priority** for "${owner}/${repo}"`);

        // collaborator adds label
        await addLabelToIssue(getOctokitCollaborator(), owner, repo, issue.number, TEST_PRIORITY_LABEL);
        await waitForNWebhooks(3);

        let issueDetails = await getOctokitAdmin().rest.issues.get({
          owner,
          repo,
          issue_number: issue.number,
        });
        expect(issueDetails.data.labels?.length).toBe(0);

        lastComment = await getLastComment(getOctokitAdmin(), owner, repo, issue.number);
        expect(lastComment.body).toContain(`@${getCollaboratorUsername()}, You are not allowed to add Priority: 1 (Normal)`);

        await getOctokitAdmin().rest.issues.update({
          owner,
          repo,
          issue_number: issue.number,
          labels: [TEST_PRIORITY_LABEL],
        });

        await removeLabelFromIssue(getOctokitCollaborator(), owner, repo, issue.number, TEST_PRIORITY_LABEL);
        await waitForNWebhooks(3);

        issueDetails = await getOctokitAdmin().rest.issues.get({
          owner,
          repo,
          issue_number: issue.number,
        });
        expect(issueDetails.data.labels?.length).toBe(1);

        lastComment = await getLastComment(getOctokitAdmin(), owner, repo, issue.number);
        expect(lastComment.body).toContain(`@${getCollaboratorUsername()}, You are not allowed to remove Priority: 1 (Normal)`);

        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/allow set-priority @${getCollaboratorUsername()} true`);
        await waitForNWebhooks(2);

        lastComment = await getLastComment(getOctokitAdmin(), owner, repo, issue.number);
        expect(lastComment.body).toContain(`Updated access for @${getCollaboratorUsername()} successfully!\t Access: **priority** for "${owner}/${repo}"`);

        await removeLabelFromIssue(getOctokitCollaborator(), owner, repo, issue.number, TEST_PRIORITY_LABEL);
        await waitForNWebhooks(1);

        issueDetails = await getOctokitAdmin().rest.issues.get({
          owner,
          repo,
          issue_number: issue.number,
        });
        expect(issueDetails.data.labels?.length).toBe(0);

        await addLabelToIssue(getOctokitCollaborator(), owner, repo, issue.number, TEST_PRIORITY_LABEL);
        await waitForNWebhooks(1);

        issueDetails = await getOctokitAdmin().rest.issues.get({
          owner,
          repo,
          issue_number: issue.number,
        });
        expect(issueDetails.data.labels?.length).toBe(1);
      },
      SIX_HOURS
    );

    test(
      "/start and /stop",
      async () => {
        await getOctokitAdmin().rest.issues.update({
          owner,
          repo,
          issue_number: issue.number,
          labels: [],
        });

        await getOctokitAdmin().rest.issues.update({
          owner,
          repo,
          issue_number: issue.number,
          state: "closed",
        });
        await waitForNWebhooks(2);

        let lastComment = await getLastComment(getOctokitAdmin(), owner, repo, issue.number);
        expect(lastComment.body).toContain("Permit generation disabled because this issue didn't qualify for funding");

        await getOctokitAdmin().rest.issues.update({
          owner,
          repo,
          issue_number: issue.number,
          state: "open",
        });
        await waitForNWebhooks(1);

        try {
          await getOctokitAdmin().rest.issues.createLabel({
            owner,
            repo,
            name: TEST_TIME_LABEL,
          });
        } catch (err) {
          expect(err).toBeDefined();
        } finally {
          await getOctokitAdmin().rest.issues.addLabels({
            owner,
            repo,
            issue_number: issue.number,
            labels: [TEST_TIME_LABEL],
          });
          await waitForNWebhooks(1);
        }

        try {
          await getOctokitAdmin().rest.issues.createLabel({
            owner,
            repo,
            name: TEST_PRIORITY_LABEL,
          });
        } catch (err) {
          expect(err).toBeDefined();
        } finally {
          await getOctokitAdmin().rest.issues.addLabels({
            owner,
            repo,
            issue_number: issue.number,
            labels: [TEST_PRIORITY_LABEL],
          });
          await waitForNWebhooks(2);
        }

        await getOctokitAdmin().rest.issues.update({
          owner,
          repo,
          issue_number: issue.number,
          state: "closed",
        });
        await waitForNWebhooks(2);

        lastComment = await getLastComment(getOctokitAdmin(), owner, repo, issue.number);
        expect(lastComment.body).toContain("Permit generation disabled because assignee is undefined");

        await getOctokitAdmin().rest.issues.update({
          owner,
          repo,
          issue_number: issue.number,
          state: "open",
        });
        await waitForNWebhooks(1);

        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/autopay false`);
        await waitForNWebhooks(2);

        lastComment = await getLastComment(getOctokitAdmin(), owner, repo, issue.number);
        expect(lastComment.body).toContain("Automatic payment for this issue is enabled: **false**");

        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/start`);
        await waitForNWebhooks(3);

        lastComment = await getLastComment(getOctokitAdmin(), owner, repo, issue.number);
        const lastCommentBody = lastComment.body?.toLowerCase();
        expect(lastCommentBody).toContain("deadline");
        expect(lastCommentBody).toContain("registered wallet");
        expect(lastCommentBody).toContain("payment multiplier");
        expect(lastCommentBody).toContain("multiplier reason");

        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/stop`);
        await waitForNWebhooks(3);

        lastComment = await getLastComment(getOctokitAdmin(), owner, repo, issue.number);
        expect(lastComment.body).toBe(`You have been unassigned from the task @${getAdminUsername()}`);

        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/start`);
        await waitForNWebhooks(3);

        await getOctokitAdmin().rest.issues.update({
          owner,
          repo,
          issue_number: issue.number,
          state: "closed",
        });
        await waitForNWebhooks(2);

        lastComment = await getLastComment(getOctokitAdmin(), owner, repo, issue.number);
        expect(lastComment.body).toContain("Permit generation disabled because automatic payment for this issue is disabled.");

        await getOctokitAdmin().rest.issues.update({
          owner,
          repo,
          issue_number: issue.number,
          state: "open",
        });
        await waitForNWebhooks(1);

        await createComment(getOctokitAdmin(), owner, repo, issue.number, `/autopay true`);
        await waitForNWebhooks(2);

        lastComment = await getLastComment(getOctokitAdmin(), owner, repo, issue.number);
        expect(lastComment.body).toBe("Automatic payment for this issue is enabled: **true**");

        await getOctokitAdmin().rest.issues.update({
          owner,
          repo,
          issue_number: issue.number,
          state: "closed",
          state_reason: "not_planned",
        });
        await waitForNWebhooks(2);

        lastComment = await getLastComment(getOctokitAdmin(), owner, repo, issue.number);
        expect(lastComment.body).toContain("Permit generation disabled because this is marked as unplanned");

        await getOctokitAdmin().rest.issues.update({
          owner,
          repo,
          issue_number: issue.number,
          state: "open",
        });
        await waitForNWebhooks(1);

        await getOctokitAdmin().rest.issues.update({
          owner,
          repo,
          issue_number: issue.number,
          state: "closed",
        });
        await waitForNWebhooks(2);

        lastComment = await getLastComment(getOctokitAdmin(), owner, repo, issue.number);
        expect(lastComment.body).toContain("Task Assignee Reward");
      },
      SIX_HOURS
    );
  };
}
