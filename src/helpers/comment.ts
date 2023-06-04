import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import TurndownService from "turndown";
import { getBotContext, getLogger } from "../bindings";

type MdastNode = {
  type: string;
  value?: string;
  url?: string;
  children: MdastNode[];
};
let cachedResult: Record<string, string[]> = {};
const traverse = (node: MdastNode, itemsToExclude: string[]): Record<string, string[]> => {
  if (!cachedResult[node.type]) {
    cachedResult[node.type] = [];
  }

  const value = node?.value || node?.url || undefined;
  if (!itemsToExclude.includes(node.type) && value) {
    cachedResult[node.type].push(value);
  } else if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      traverse(child, itemsToExclude);
    }
  }

  return cachedResult;
};

export const parseComments = async (comments: string[], itemsToExclude: string[]): Promise<Record<string, string[]>> => {
  const logger = getLogger();
  const result: Record<string, string[]> = {};
  const turndown = new TurndownService();
  for (const comment of comments) {
    logger.debug(`Parsing content: ${comment}`);
    const mardownDoc = await renderMarkdown(comment);
    if (!mardownDoc) continue;
    const tree = fromMarkdown(turndown.turndown(mardownDoc), {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()],
    });

    const parsedContent = traverse(tree as MdastNode, itemsToExclude);
    cachedResult = {};
    logger.debug("Parsed content: ");
    logger.debug(parsedContent);

    for (const key of Object.keys(parsedContent)) {
      if (Object.keys(result).includes(key)) {
        result[key].push(...parsedContent[key]);
      } else {
        result[key] = parsedContent[key];
      }
    }

    logger.debug("Next iterating:");
  }

  logger.debug("Returning the result");
  logger.debug(result);

  return result;
};

export const renderMarkdown = async (text: string): Promise<string | undefined> => {
  const logger = getLogger();
  const context = getBotContext();
  try {
    const res = await context.octokit.rest.markdown.render({
      text,
    });
    return res.status === 200 ? res.data : undefined;
  } catch (err: unknown) {
    logger.debug(`Error rednering a text: ${text}.`);
  }

  return undefined;
};
