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

export const createDetailsTable = (amount: string, paymentURL: string, values: { header: string; label: string; value: string }[]): string => {
  // Generate the table rows based on the values array
  const tableRows = values
    .map(({ label, value, header }) => {
      return `
        <tr>
          <td>${header || ""}</td>
          <td>${label}</td>
          <td>${value}</td>
        </tr>
      `;
    })
    .join("");

  // Construct the complete HTML structure
  const html = `
    <details>
      <summary>
        <b>
          <h3>
            <a href="${paymentURL}">[ ${amount} ]</a>
          </h3>
        </b>
      </summary>
      <code>
        <table>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </code>
    </details>
  `;

  return html;
};
