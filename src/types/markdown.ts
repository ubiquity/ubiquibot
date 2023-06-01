export const MarkdownItem = {
  Paragraph: "paragraph",
  List: "list",
  Link: "link",
  Text: "text",
  Code: "code",
  Image: "image",
  BlockQuote: "blockquote",
} as const;
export type MarkdownItem = (typeof MarkdownItem)[keyof typeof MarkdownItem];
