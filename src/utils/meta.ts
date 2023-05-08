import * as linkify from "linkifyjs";

export const isMetaTitle = (title: string): boolean => {
  const META_TEXT = ["meta"];
  return META_TEXT.some((v) => title.toLowerCase().includes(v));
};

export const isMetaList = (text: string): boolean => {
  const META_CONSTANT = 2;
  const CRLF = text.includes("\r\n") ? { pad: "\r\n-", type: "rn" } : { pad: "\n-", type: "n" };
  const padText = CRLF.pad + text + CRLF.pad;
  const listArray = CRLF.type === "rn" ? padText.match(/\[.\](?:.*?\r\n-|.*?\r\n\r\n)/gms) : padText.match(/\[.\](?:.*?\n-|.*?\n\n)/gms);
  if (listArray !== null && listArray.length > 0) {
    if (listArray.length > 0) {
      const flat = listArray.join("");
      const link = linkify.find(flat);
      const id = flat.match(/#[0-9].*?(?![0-9])/gms);
      const linkCount = link !== null ? link.length : 0;
      const idCount = id !== null ? id.length : 0;
      if (linkCount + idCount >= META_CONSTANT) {
        return true;
      }
    }
  }

  return false;
};

export const isMeta = (title: string, text: string): boolean => {
  return isMetaTitle(title) || isMetaList(text);
};
