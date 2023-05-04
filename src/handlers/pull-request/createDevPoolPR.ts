import { getBotContext } from "../../bindings";

export const createDevPoolPR = async () => {
  console.log("new install");
  const context = getBotContext();
  // replace with the owner and name of the repository you want to create the branch in
  const owner = "seprintour";
  const repo = "betterbuy";

  // create a new branch
  const branchName = "my-branch";
  const baseRef = "master"; // replace with the name of the base branch

  const { data: branch } = await context.octokit.repos.getBranch({
    owner,
    repo,
    branch: "master",
  });

  const { data: file } = await context.octokit.repos.getContent({
    owner,
    repo,
    path: "projects.json",
    ref: "master",
  });

  const curContent = Buffer.from(JSON.parse(JSON.stringify(file)).content!, "base64").toString();

  console.log(curContent);

  // const mainSha = branch.commit.sha;

  // await context.octokit.git.createRef({
  //   owner,
  //   repo,
  //   ref: `refs/heads/${branchName}`,
  //   sha: mainSha,
  // });

  // // create a new file on the branch
  // const path = 'path/to/my/file.txt';
  // const content = 'This is my new content';
  // const createFileResponse = await context.octokit.repos.createOrUpdateFileContents({
  //   owner,
  //   repo,
  //   path,
  //   message: 'Add file',
  //   content: Buffer.from(content).toString('base64'),
  //   branch: branchName
  // });
  // console.log(createFileResponse.data);

  // // create the pull request
  // const pullRequest = await context.octokit.pulls.create({
  //   owner,
  //   repo,
  //   title: 'My pull request',
  //   head: branchName,
  //   base: baseRef,
  //   body: 'This is my pull request',
  // });
  // console.log(pullRequest.data);
};
