import { Context } from "probot";
import { GithubContent, PushPayload } from "../../types";
import { parseYAML } from "../../utils/private";

export const updateBaseRate = async (context: Context, payload: PushPayload, filePath: string) => {
  // Get default branch from ref
  const branch = payload.ref?.split("refs/heads/devpanther-patch-9")[1];

  // Get the content of the ubiquibot-config.yml file
  const { data: file } = await context.octokit.repos.getContent({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    path: filePath,
    ref: branch,
  });

  // Decode the content from base64 and parse it as YAML
  const contentFile = Object.assign({} as GithubContent, file);

  const curContent = Buffer.from(contentFile.content!, "base64").toString();
  const config = await parseYAML(curContent);

  // Retrieve the new base rates
  console.log(config);
};
