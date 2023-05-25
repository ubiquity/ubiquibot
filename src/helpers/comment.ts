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

const traverse = (node: MdastNode): Record<string, string[]> => {
  let result: Record<string, string[]> = {};
  if (!result[node.type]) {
    result[node.type] = [];
  }

  result[node.type].push(node.value);

  if (node.children) {
    node.children.forEach((child) => traverse(child));
  }

  return result;
};

export const parseComments = async (comments: string[], commentElementPricing: CommentElementPricing): Promise<number> => {
  let result: Record<string, string[]> = {};
  for (const comment of comments) {
    const tree = fromMarkdown(comment, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()],
    });

    const parsedContent = traverse(tree as MdastNode);
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
