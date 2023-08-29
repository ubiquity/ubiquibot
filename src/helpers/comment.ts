import { MarkdownItem } from "../types";

type Node = {
  type: MarkdownItem;
  value: string;
  depth?: number;
  children: Node[];
};

const traverse = (result: Record<MarkdownItem, string[]>, node: Node, itemsToExclude: string[]): Record<MarkdownItem, string[]> => {
  if (!result[node.type]) {
    result[node.type] = [];
  }

  if (node.type === MarkdownItem.Heading) {
    node.type = `heading${node.depth}` as MarkdownItem;
  }

  result[node.type].push(node.value?.trim() ?? "");

  if (itemsToExclude.includes(node.type)) {
    return result;
  }

  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => traverse(result, child, itemsToExclude));
  }

  return result;
};

export const parseComments = async (comments: string[], itemsToExclude: string[]): Promise<Record<MarkdownItem, string[]>> => {
  // dynamic import of mdast
  const { fromMarkdown } = await import("mdast-util-from-markdown");
  const { gfmFromMarkdown } = await import("mdast-util-gfm");
  const { gfm } = await import("micromark-extension-gfm");

  const result: Record<MarkdownItem, string[]> = {
    [MarkdownItem.Text]: [],
    [MarkdownItem.Paragraph]: [],
    [MarkdownItem.Heading]: [],
    [MarkdownItem.Heading1]: [],
    [MarkdownItem.Heading2]: [],
    [MarkdownItem.Heading3]: [],
    [MarkdownItem.Heading4]: [],
    [MarkdownItem.Heading5]: [],
    [MarkdownItem.Heading6]: [],
    [MarkdownItem.ListItem]: [],
    [MarkdownItem.List]: [],
    [MarkdownItem.Link]: [],
    [MarkdownItem.Image]: [],
    [MarkdownItem.BlockQuote]: [],
    [MarkdownItem.Code]: [],
    [MarkdownItem.Emphasis]: [],
    [MarkdownItem.Strong]: [],
    [MarkdownItem.Delete]: [],
    [MarkdownItem.HTML]: [],
    [MarkdownItem.InlineCode]: [],
    [MarkdownItem.LinkReference]: [],
    [MarkdownItem.ImageReference]: [],
    [MarkdownItem.FootnoteReference]: [],
    [MarkdownItem.FootnoteDefinition]: [],
    [MarkdownItem.Table]: [],
    [MarkdownItem.TableCell]: [],
    [MarkdownItem.TableRow]: [],
    [MarkdownItem.ThematicBreak]: [],
    [MarkdownItem.Break]: [],
    [MarkdownItem.Root]: [],
    [MarkdownItem.Definition]: [],
  };

  for (const comment of comments) {
    const tree = fromMarkdown(comment, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()],
    });
    console.log(`Comment Mdast Tree: ${JSON.stringify(tree, null, 2)}`);
    traverse(result, tree as Node, itemsToExclude);
  }

  console.log(`Comment Parsed: ${JSON.stringify(result, null, 2)}`);

  // remove empty values
  if (result[MarkdownItem.Text]) {
    result[MarkdownItem.Text] = result[MarkdownItem.Text].filter((str) => str.length > 0);
  }

  console.log(`Comment Parsed Cleaned: ${JSON.stringify(result, null, 2)}`);

  return result;
};
