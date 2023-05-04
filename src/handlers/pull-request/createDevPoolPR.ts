import { getBotContext, getLogger } from "../../bindings";
import { Payload } from "../../types";

export const createDevPoolPR = async () => {
  const context = getBotContext();
  const logger = getLogger();
  let payload = context.payload as Payload;

  if (payload.repositories_added?.length === 0) {
    return;
  }

  let repository = payload.repositories_added![0];

  const [owner, repo] = repository.full_name.split("/");

  logger.info(`New Install: ${repository.full_name}`);

  // create a new branch
  const branchName = `add-${repository.full_name}`;
  const baseRef = "master";
  const path = "projects.json";

  const { data: branch } = await context.octokit.repos.getBranch({
    owner,
    repo,
    branch: "master",
  });

  // Get the current projects json file
  const { data: file } = await context.octokit.repos.getContent({
    owner,
    repo,
    path: "projects.json",
    ref: "master",
  });

  const curContent = Buffer.from(JSON.parse(JSON.stringify(file)).content!, "base64").toString();

  const curContentParsed = JSON.parse(curContent);

  // Edit the urls in content
  curContentParsed["urls"].push(`https://github.com/${repository.full_name}`);

  // current hash of main branch
  const mainSha = branch.commit.sha;

  // create branch from sha
  await context.octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: mainSha,
  });

  await context.octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: `Add ${repository.full_name} to repo`,
    content: Buffer.from(curContentParsed).toString("base64"),
    branch: branchName,
  });

  // create the pull request
  await context.octokit.pulls.create({
    owner,
    repo,
    title: `Add ${repository.full_name} to repo`,
    head: branchName,
    base: baseRef,
    body: "",
  });

  logger.info("New repository added to devpool");
};
