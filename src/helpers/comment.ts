import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";

export const MarkdownItem = {
  Paragraph: "paragraph",
  List: "list",
  Link: "link",
  Text: "text",
  Code: "code",
} as const;
export type MarkdownItem = (typeof MarkdownItem)[keyof typeof MarkdownItem];

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

export const parseComments = async (comments: string[]) => {
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

  console.log(result);
};
