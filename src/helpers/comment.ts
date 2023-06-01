import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { MarkdownItem } from "../types";
import { CommentElementPricing } from "../types";

type MdastNode = {
  type: string;
  value: string;
  children: MdastNode[];
};
const ItemsToExclude: string[] = [MarkdownItem.BlockQuote];
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

export const parseComments = async (comments: string[], itemsToExclude: string[], commentElementPricing: CommentElementPricing): Promise<number> => {
  const result: Record<string, string[]> = {};
  for (const comment of comments) {
    const tree = fromMarkdown(comment, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()],
    });

    const parsedContent = traverse(tree as MdastNode, itemsToExclude);
    for (const key of Object.keys(parsedContent)) {
      if (Object.keys(result).includes(key)) {
        result[key].push(...parsedContent[key]);
      } else {
        result[key] = parsedContent[key];
      }
    }
  }

  let sum = 0;
  for (const key of Object.keys(result)) {
    const rewardValue = commentElementPricing[key];
    const value = result[key];
    if (key == MarkdownItem.Text) {
      sum += value.length * rewardValue;
    } else {
      sum += rewardValue;
    }
  }

  return sum;
};
