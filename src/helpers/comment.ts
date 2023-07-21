import parse5 from "parse5";

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

  result[node.nodeName].push(node.value ?? "");

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

  return result;
};
