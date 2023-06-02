import { getLogger } from "../../bindings";
import { listLabelsForRepo, updateLabelsFromBaseRate } from "../../helpers";
import { Label } from "../../types";

export const updateBaseRate = async () => {
  const logger = getLogger();

  // fetch all labels
  const repoLabels = await listLabelsForRepo(100, 1, true);

  if (repoLabels.length === 0) {
    logger.debug("No labels on this repo");
    return;
  }

  updateLabelsFromBaseRate(repoLabels as Label[]);
};
