import { deleteLabel } from "./delete-label";
import exampleResponse from "./example-response";
import { getFromGitHub } from "./get-from-github";
import { Label } from "./label";

export default async function clearUnusedLabels(REPOSITORY: string, TOKEN: string) {
  if (TOKEN === undefined) {
    throw new Error("GITHUB_TOKEN is not defined");
  }

  const issuesAndPRs = await getFromGitHub(`/repos/${REPOSITORY}/issues?per_page=1000`, TOKEN);

  const preserveList = new Set<string>();

  for (const item of issuesAndPRs as (typeof exampleResponse)[]) {
    item.labels.forEach((label: Label) => {
      preserveList.add(label.name);
    });
  }

  console.log("preserveList: ");
  console.log(preserveList);

  const labelsResponse = await getFromGitHub(`/repos/${REPOSITORY}/labels?per_page=1000`, TOKEN);

  // delete all labels that are not in the preserve list
  for (const label of labelsResponse as Label[]) {
    if (!preserveList.has(label.name)) {
      console.log(`Removing label: "${label.name}"`);
      await deleteLabel(label.name, REPOSITORY, TOKEN);
    }
  }
}
