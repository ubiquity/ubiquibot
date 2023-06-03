import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { getBotContext, getLogger } from "../bindings";

type MdastNode = {
  type: string;
  value: string;
  children: MdastNode[];
};
const cachedResult: Record<string, string[]> = {};
const traverse = (node: MdastNode, itemsToExclude: string[]): Record<string, string[]> => {
  if (!cachedResult[node.type]) {
    cachedResult[node.type] = [];
  }

  if (!itemsToExclude.includes(node.type)) {
    // skip pushing if the node type has been excluded
    cachedResult[node.type].push(node.value);
  } else if (node.children.length > 0) {
    node.children.forEach((child) => traverse(child, itemsToExclude));
  }

  return cachedResult;
};

export const parseComments = async (comments: string[], itemsToExclude: string[]): Promise<Record<string, string[]>> => {
  const logger = getLogger();
  const result: Record<string, string[]> = {};
  for (const comment of comments) {
    const mardownDoc = await renderMarkdown(comment);
    if (!mardownDoc) continue;
    const tree = fromMarkdown(mardownDoc, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()],
    });

    logger.debug("tree generated: ", tree);

    const parsedContent = traverse(tree as MdastNode, itemsToExclude);
    for (const key of Object.keys(parsedContent)) {
      if (Object.keys(result).includes(key)) {
        result[key].push(...parsedContent[key]);
      } else {
        result[key] = parsedContent[key];
      }
    }
  }

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
