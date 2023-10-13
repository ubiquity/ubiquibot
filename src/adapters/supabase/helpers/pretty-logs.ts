/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Logs } from "./tables/logs";

export const prettyLogs = {
  error: function logError(message: string, metadata?: any) {
    logWithStack("error", message, metadata);
  },

  warn: function logWarn(message: string, metadata?: any) {
    logWithStack("warn", message, metadata);
  },

  ok: function logOk(message: string, metadata?: any) {
    logWithStack("ok", message, metadata);
  },

  info: function logInfo(message: string, metadata?: any) {
    logWithStack("info", message, metadata);
  },

  debug: function logDebug(message: string, metadata?: any) {
    logWithStack("debug", message, metadata);
  },

  http: function logHttp(message: string, metadata?: any) {
    logWithStack("http", message, metadata);
  },

  verbose: function logVerbose(message: string, metadata?: any) {
    logWithStack("verbose", message, metadata);
  },

  silly: function logSilly(message: string, metadata?: any) {
    logWithStack("silly", message, metadata);
  },
};
interface Metadata {
  error?: { stack?: string };
  stack?: string;
  message?: string;
  name?: string;
  [key: string]: any;
}
function logWithStack(type: keyof typeof prettyLogs, message: string, metadata?: Metadata) {
  const stack = metadata?.error?.stack || metadata?.stack || new Error().stack;

  _log(type, message);
  if (metadata) {
    const newMetadata = { ...metadata };
    delete newMetadata.message;
    delete newMetadata.name;
    delete newMetadata.stack;

    if (Object.keys(newMetadata).length > 0) {
      _log(type, newMetadata);
    }
  }

  if (typeof stack == "string") {
    const prettyStack = formatStackTrace(stack, 1);
    const colorizedStack = colorizeText(prettyStack, "dim");
    _log(type, colorizedStack);
  } else {
    throw new Error("stack is not a string");
  }
}

function _log(type: keyof typeof prettyLogs, message: any) {
  const defaultSymbols: Record<keyof typeof prettyLogs, string> = {
    error: "×",
    ok: "✓",
    warn: "⚠",
    info: "›",
    debug: "››",
    http: "🛜",
    verbose: "💬",
    silly: "🤪",
  };

  const symbol = defaultSymbols[type];

  // Formatting the message
  const messageFormatted =
    typeof message === "string" ? message : JSON.stringify(Logs.convertErrorsIntoObjects(message));

  // const messageFormatted =
  // typeof message === "string" ? message : JSON.stringify(Logs.convertErrorsIntoObjects(message));

  // Constructing the full log string with the prefix symbol
  const lines = messageFormatted.split("\n");
  const logString = lines
    .map((line, index) => {
      // Add the symbol only to the first line and keep the indentation for the rest
      const prefix = index === 0 ? `\t${symbol}` : `\t${" ".repeat(symbol.length)}`;
      return `${prefix} ${line}`;
    })
    .join("\n");

  const fullLogString = logString;

  const colorMap: Record<keyof typeof prettyLogs, string[]> = {
    error: ["error", "fgRed"],
    ok: ["log", "fgGreen"],
    warn: ["warn", "fgYellow"],
    info: ["info", "dim"],
    debug: ["debug", "dim"],
    http: ["debug", "dim"],
    verbose: ["debug", "dim"],
    silly: ["debug", "dim"],
  };

  const _console = console[colorMap[type][0] as keyof typeof console] as (...args: string[]) => void;
  if (typeof _console === "function") {
    _console(colorizeText(fullLogString, colorMap[type][1] as keyof typeof colors));
  } else {
    throw new Error(fullLogString);
  }
}

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  fgBlack: "\x1b[30m",
  fgRed: "\x1b[31m",
  fgGreen: "\x1b[32m",
  fgYellow: "\x1b[33m",
  fgBlue: "\x1b[34m",
  fgMagenta: "\x1b[35m",
  fgCyan: "\x1b[36m",
  fgWhite: "\x1b[37m",

  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",
};
export function colorizeText(text: string, color: keyof typeof colors): string {
  return colors[color].concat(text).concat(colors.reset);
}

export function formatStackTrace(stack: string, linesToRemove = 0, prefix = ""): string {
  const lines = stack.split("\n");
  for (let i = 0; i < linesToRemove; i++) {
    lines.shift(); // Remove the top line
  }
  return lines
    .map((line) => `${prefix}${line.replace(/\s*at\s*/, "  ↳  ")}`) // Replace 'at' and prefix every line
    .join("\n");
}
