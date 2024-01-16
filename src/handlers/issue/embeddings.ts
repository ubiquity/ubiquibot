import { getBotContext, getLogger } from "../../bindings";
import { Payload } from "../../types";
import { generateEmbeddings } from "../../helpers";
import { upsertEmbeddings } from "../../adapters/supabase";

/**
 * Generates an embedding vector for the current issue
 */
export const embeddings = async () => {
  const { payload: _payload } = getBotContext();
  const logger = getLogger();
  const payload = _payload as Payload;
  const issue = payload.issue;

  if (!issue) {
    logger.info(`Skip to generate embeddings because of no issue instance`);
    return;
  }

  if (!issue.body) {
    logger.info("Skip to generate embeddings because of empty body");
    return;
  }

  const embeddings = await generateEmbeddings(issue.body);
  if (embeddings.length > 0) {
    await upsertEmbeddings(payload.repository.owner.login, payload.repository.name, issue.number, embeddings);
  }
};
