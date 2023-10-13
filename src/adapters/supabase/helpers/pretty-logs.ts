/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Logs } from "./tables/logs";

export const prettyLogs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: function errorLog(message: string, metadata?: any) {
    const stack = metadata?.error?.stack || metadata?.stack;

    if (stack) {
      // stack found
      const prettyStack = formatStackTrace(stack.join("\n"), 1);
      const colorizedStack = colorizeText(prettyStack, "dim");

      _log("error", message);
      if (metadata) {
        const newMetadata = { ...metadata };
        delete newMetadata.message;
        delete newMetadata.name;
        delete newMetadata.stack;

        if (Object.keys(newMetadata).length > 0) {
          _log("info", newMetadata);
        }
      }
      _log("error", colorizedStack);
    } else {
      // generate stack
      _log("error", message);
      const stack = new Error().stack;
      if (stack) _log("error", colorizeText(formatStackTrace(stack, 4), "dim")); // Log the formatted stack trace
    }
  },

  warn: function warnLog(message: string, metadata?: any) {
    _log("warn", message);
    if (metadata) {
      _log("warn", metadata);
    }
    const error = new Error();
    const stack = error.stack;
    if (stack) {
      _log("warn", colorizeText(formatStackTrace(stack, 4), "dim")); // Log the formatted stack trace
    }
  },

  ok: function okLog(message: string, _metadata?: any) {
    _log("ok", message);
  },

  info: function infoLog(message: string, _metadata?: any) {
    _log("info", message);
  },

  debug: function debugLog(message: string, _metadata?: any) {
    _log("debug", message);
    const stack = new Error().stack;
    if (stack) _log("debug", colorizeText(formatStackTrace(stack, 4), "dim")); // Log the formatted stack trace
  },
  http: function httpLog(message: string, _metadata?: any) {
    _log("http", message);
  },
  verbose: function verboseLog(message: string, _metadata?: any) {
    _log("verbose", message);
  },
  silly: function sillyLog(message: string, _metadata?: any) {
    _log("silly", message);
  },
};

function _log(type: keyof typeof prettyLogs, message: string) {
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
