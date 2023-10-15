import Runtime from "../bindings/bot-runtime";

// Get the previous file content
export async function getPreviousFileContent(owner: string, repo: string, branch: string, filePath: string) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const context = runtime.eventContext;

  try {
    // Get the latest commit of the branch
    const branchData = await context.octokit.repos.getBranch({
      owner,
      repo,
      branch,
    });
    const latestCommitSha = branchData.data.commit.sha;

    // Get the commit details
    const commitData = await context.octokit.repos.getCommit({
      owner,
      repo,
      ref: latestCommitSha,
    });

    // Find the file in the commit tree
    const file = commitData.data.files ? commitData.data.files.find((file) => file.filename === filePath) : undefined;
    if (file) {
      // Retrieve the previous file content from the commit's parent
      const previousCommitSha = commitData.data.parents[0].sha;
      const previousCommit = await context.octokit.git.getCommit({
        owner,
        repo,
        commit_sha: previousCommitSha,
      });

      // Retrieve the previous file tree
      const previousTreeSha = previousCommit.data.tree.sha;
      const previousTree = await context.octokit.git.getTree({
        owner,
        repo,
        tree_sha: previousTreeSha,
        recursive: "true",
      });

      // Find the previous file content in the tree
      const previousFile = previousTree.data.tree.find((item) => item.path === filePath);
      if (previousFile && previousFile.sha) {
        // Get the previous file content
        const previousFileContent = await context.octokit.git.getBlob({
          owner,
          repo,
          file_sha: previousFile.sha,
        });
        return previousFileContent.data.content;
      }
    }
    return null;
  } catch (error: unknown) {
    logger.debug("Error retrieving previous file content.", { error });
    return null;
  }
}

export async function getFileContent(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  commitSha?: string
): Promise<string | null> {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const context = runtime.eventContext;

  try {
    if (!commitSha) {
      // Get the latest commit of the branch
      const branchData = await context.octokit.repos.getBranch({
        owner,
        repo,
        branch,
      });
      commitSha = branchData.data.commit.sha;
    }

    // Get the commit details
    const commitData = await context.octokit.repos.getCommit({
      owner,
      repo,
      ref: commitSha,
    });

    // Find the file in the commit tree
    const file = commitData.data.files ? commitData.data.files.find((file) => file.filename === filePath) : undefined;
    if (file) {
      // Retrieve the file tree
      const tree = await context.octokit.git.getTree({
        owner,
        repo,
        tree_sha: commitData.data.commit.tree.sha,
        recursive: "true",
      });

      // Find the previous file content in the tree
      const file = tree.data.tree.find((item) => item.path === filePath);
      if (file && file.sha) {
        // Get the previous file content
        const fileContent = await context.octokit.git.getBlob({
          owner,
          repo,
          file_sha: file.sha,
        });
        return fileContent.data.content;
      }
    }
    return null;
  } catch (error: unknown) {
    logger.debug("Error retrieving file content.", { error });
    return null;
  }
}
