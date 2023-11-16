import Decimal from "decimal.js";
import { isEmpty } from "lodash";
import * as parse5 from "parse5";

type Node = {
  nodeName: string;
  tagName?: string;
  value?: string;
  childNodes?: Node[];
};

const traverse = (result: Record<string, string[]>, node: Node, itemsToExclude: string[]): Record<string, string[]> => {
  if (itemsToExclude.includes(node.nodeName)) {
    return result;
  }

  if (!result[node.nodeName]) {
    result[node.nodeName] = [];
  }

  result[node.nodeName].push(node.value?.trim() ?? "");

  if (node.childNodes && node.childNodes.length > 0) {
    node.childNodes.forEach((child) => traverse(result, child, itemsToExclude));
  }

  return result;
};

export const parseComments = (comments: string[], itemsToExclude: string[]): Record<string, string[]> => {
  const result: Record<string, string[]> = {};

  for (const comment of comments) {
    const fragment = parse5.parseFragment(comment);
    traverse(result, fragment as Node, itemsToExclude);
  }

  // remove empty values
  if (result["#text"]) {
    result["#text"] = result["#text"].filter((str) => str.length > 0);
  }

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
        .filter(([key, value]) => value.count > 0)
        .map(([key, value]) => {
          const element = key === "#text" ? "words" : key;
          const units = value.count;
          const reward = value.reward;
          return { element, units, reward };
        });
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
