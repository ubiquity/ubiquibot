// // not supported out the box. add "type": "module" to package.json then call it
// import { readFileSync, writeFileSync } from "fs";

// function parseLine(line) {
//   const fields = line.split(/\t/);
//   if (fields.length < 2) return null;

//   const [, filePath] = fields;

//   if (filePath.endsWith(".d.ts")) return null;

//   return { filePath };
// }

// export function convertCtagsToJson(ctagsFilePath, jsonOutputPath) {
//   const ctagsData = readFileSync(ctagsFilePath, "utf-8");
//   const lines = ctagsData.split("\n").slice(93);

//   const jsonOutput = {};

//   for (const line of lines) {
//     const parsedLine = parseLine(line);
//     if (parsedLine) {
//       const { filePath } = parsedLine;
//       if (!jsonOutput[filePath]) {
//         jsonOutput[filePath] = true;
//       }
//     }
//   }

//   writeFileSync(jsonOutputPath, JSON.stringify(Object.keys(jsonOutput), null, 2), "utf-8");
// }

// convertCtagsToJson("../.tags", "tags.json");
