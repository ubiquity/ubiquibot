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

export const parseComments = async (comments: string[]) => {
  for (const comment of comments) {
    const tree = fromMarkdown(comment, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()],
    });

    tree.children;

    console.log(JSON.stringify(tree));
  }
};
