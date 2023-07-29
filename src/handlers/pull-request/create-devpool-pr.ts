import { getBotContext, getLogger } from "../../bindings";
import { GithubContent, Payload } from "../../types";

export const createDevPoolPR = async () => {
  const logger = getLogger();

  const context = getBotContext();
  const payload = context.payload as Payload;

  const devPoolOwner = "ubiquity";
  const devPoolRepo = "devpool-directory";

  if (!payload.repositories_added) {
    return;
  }

  const repository = payload.repositories_added[0];

  logger.info(`New Install: ${repository.full_name}`);

  const [owner, repo] = repository.full_name.split("/");

  // create a new branch
  const branchName = `add-${owner}-${repo}`;
  const baseRef = "development";
  const path = "projects.json";

  const { data: branch } = await context.octokit.repos.getBranch({
    owner: devPoolOwner,
    repo: devPoolRepo,
    branch: "development",
  });

  // Get the current projects json file
  const { data: file } = await context.octokit.repos.getContent({
    owner: devPoolOwner,
    repo: devPoolRepo,
    path,
    ref: "development",
  });

  const contentFile = Object.assign({} as GithubContent, file);

  const curContent = Buffer.from(contentFile.content, "base64").toString();

  const curContentParsed = JSON.parse(curContent);

  // Edit the urls in content
  curContentParsed["urls"].push(`https://github.com/${repository.full_name}`);

  // current hash of main branch
  const mainSha = branch.commit.sha;

  // create branch from sha
  await context.octokit.git.createRef({
    owner: devPoolOwner,
    repo: devPoolRepo,
    ref: `refs/heads/add-${owner}-${repo}`,
    sha: mainSha,
  });

  logger.info("Branch created on DevPool Directory");

  await context.octokit.repos.createOrUpdateFileContents({
    owner: devPoolOwner,
    repo: devPoolRepo,
    path,
    message: `feat: add ${repository.full_name}`,
    content: Buffer.from(JSON.stringify(curContentParsed, null, 2)).toString("base64"),
    branch: branchName,
    sha: contentFile.sha,
  });

  // create the pull request
  await context.octokit.pulls.create({
    owner: devPoolOwner,
    repo: devPoolRepo,
    title: `Add ${repository.full_name} to repo`,
    head: branchName,
    base: baseRef,
    body: "",
  });

  logger.info("Pull request created on DevPool Directory");
};
