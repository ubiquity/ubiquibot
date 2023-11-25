export const markdownItem = {
  Paragraph: "paragraph",
  List: "list",
  Link: "link",
  Text: "text",
  Code: "code",
  Image: "image",
  BlockQuote: "blockquote",
} as const;
export type MarkdownItem = (typeof markdownItem)[keyof typeof markdownItem];
