import { MarkdownItem } from "../types";
import fromMarkdown from "mdast-util-from-markdown";
import gfmFromMarkdown from "mdast-util-gfm";
import gfm from "micromark-extension-gfm";
import Decimal from "decimal.js";
import { isEmpty } from "lodash";

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
      mdastExtensions: [gfmFromMarkdown.fromMarkdown],
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

export const generateCollapsibleTable = (data: { element: string; units: number; reward: Decimal }[]) => {
  // Check if the data array is empty
  if (data.length === 0) {
    return "No data to display.";
  }

  // Create the table header row
  const headerRow = "| element | units | reward |\n| --- | --- | --- |";

  // Create the table rows from the data array
  const tableRows = data.map((item) => `| ${item.element} | ${item.units} | ${item.reward} |`).join("\n");

  // Create the complete Markdown table
  const tableMarkdown = `
<details>
  <summary>Details</summary>
    
${headerRow}
${tableRows}
    
</details>
  `;

  return tableMarkdown;
};

export const createDetailsTable = (
  amount: string,
  paymentURL: string,
  username: string,
  values: { title: string; subtitle: string; value: string }[],
  debug: Record<
    string,
    {
      count: number;
      reward: Decimal;
    }
  >
): string => {
  let collapsibleTable = null;
  // Generate the table rows based on the values array
  const tableRows = values
    .map(({ title, value, subtitle }) => {
      if (!subtitle || !value) {
        return "";
      }
      return `<tr>
          <td>${title || ""}</td>
          <td>${subtitle}</td>
          <td>${value}</td>
        </tr>`;
    })
    .join("");

  if (!isEmpty(debug)) {
    const data = Object.entries(debug)
      .filter(([_, value]) => value.count > 0)
      .map(([key, value]) => {
        const element = key === "#text" ? "words" : key;
        const units = value.count;
        const reward = value.reward;
        return { element, units, reward };
      });

    collapsibleTable = generateCollapsibleTable(data);
  }

  // Construct the complete HTML structure
  const html = `
    <details>
      <summary>
        <b>
          <h3>
            <a href="${paymentURL}">[ ${amount} ]</a>
          </h3>
          <h6>&nbsp;@${username}</h6>
        </b>
      </summary>
      <table>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      ${collapsibleTable ? "COLLAPSIBLE_TABLE_PLACEHOLDER" : ""}
    </details>
  `;

  // Remove spaces and line breaks from the HTML, ignoring the attributes like <a href="..."> and [ ... ]
  const cleanedHtml = html.replace(/>\s+</g, "><").replace(/[\r\n]+/g, "");

  // Add collapsible table here to avoid compression
  const finalHtml = cleanedHtml.replace("COLLAPSIBLE_TABLE_PLACEHOLDER", collapsibleTable || "");

  return finalHtml;
};
