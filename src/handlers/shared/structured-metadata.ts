import { execSync } from "child_process";

function createStructuredMetadata(className: string, metadata: unknown) {
  const jsonString = JSON.stringify(metadata, null, 2);
  const stackLine = new Error().stack?.split("\n")[2] ?? "";
  const caller = stackLine.match(/at (\S+)/)?.[1] ?? "";
  const revision = execSync("git rev-parse --short HEAD").toString().trim();
  return [`<!-- Ubiquity - ${className} - ${caller} - ${revision}`, jsonString, "-->"].join("\n");
}

function parseStructuredMetadata(comment: string) {
  const regex = /<!-- Ubiquity - (.+?) - (.+?) - (.+?)\n(.*?)-->/gs;

  const match = regex.exec(comment);

  if (!match) {
    return null;
  }

  const [, type, caller, revision, jsonString] = match;

  let metadata;
  try {
    // TODO: fix metadata writing to encode html comments inside json without the html parser getting confused
    metadata = JSON.parse(jsonString.trim());
  } catch (error) {
    console.trace(jsonString);
    console.error("Failed to parse JSON:", error);

    return null;
  }

  return {
    className: type.trim(),
    caller: caller.trim(),
    revision: revision.trim(),
    metadata,
  };
}

export default {
  create: createStructuredMetadata,
  parse: parseStructuredMetadata,
};
