import esbuild from "esbuild";
const typescriptEntries = ["scripts/helpers/utils.ts", "scripts/index.ts", "scripts/constants/index.ts"];
export const entries = [...typescriptEntries];

export let esBuildContext = {
  sourcemap: false,
  entryPoints: entries,
  bundle: true,
  minify: false,
  loader: {
    ".png": "dataurl",
    ".woff": "dataurl",
    ".woff2": "dataurl",
    ".eot": "dataurl",
    ".ttf": "dataurl",
    ".svg": "dataurl",
  },
  outdir: "scripts",
} as esbuild.BuildOptions;
