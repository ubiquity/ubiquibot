import { convertErrorsIntoObjects } from "./tables/logs";

export const prettyLogs = {
  error: function errorLog(...args: unknown[]) {
    if (args[0] instanceof Error) {
      console.error(args[0].message); // Log the error message
      if (args[0].stack) {
        console.error(formatStackTrace(args[0].stack, 4)); // Log the formatted stack trace separately
      }
      _log("error", ...args); // Log the original error with metadata
      return;
    }

    if (typeof args[0] === "object" && args[0] !== null && "stack" in args[0]) {
      const { message, stack } = args[0] as { message: string; stack: string };
      console.error(message); // Log the error message
      console.error(formatStackTrace(stack, 4)); // Log the formatted stack trace separately
      _log("error", ...args); // Log the original error with metadata
      return;
    }

    _log("error", ...args);

    const stack = new Error().stack;
    if (stack) _log("error", formatStackTrace(stack, 4)); // Log the formatted stack trace
  },

  warn: function warnLog(...args: unknown[]) {
    _log("warn", ...args);
    const stack = new Error().stack;
    if (stack) _log("warn", formatStackTrace(stack, 4)); // Log the formatted stack trace
  },

  ok: function okLog(...args: unknown[]) {
    _log("ok", ...args);
  },

  info: function infoLog(...args: unknown[]) {
    _log("info", ...args);
  },

  debug: function debugLog(...args: unknown[]) {
    _log("debug", ...args);
    const stack = new Error().stack;
    if (stack) _log("debug", formatStackTrace(stack, 4)); // Log the formatted stack trace
  },
};

function _log(type: "error" | "ok" | "warn" | "info" | "debug", ...args: unknown[]) {
  const defaultSymbols = {
    error: "×",
    ok: "✓",
    warn: "⚠",
    info: "›",
    debug: "↳",
  };

  // Extracting the optional symbol from the arguments
  let symbol = defaultSymbols[type];
  let messageArgs = args;

  if (args.length > 1 && typeof args[0] === "string") {
    symbol = args[0];
    messageArgs = args.slice(1);
  }

  // Formatting the message
  const message = messageArgs
    .map((arg) => {
      if (typeof arg === "string") {
        return arg;
      } else {
        return JSON.stringify(arg, null, "  ");
      }
    })
    .join(" ");

  // Constructing the full log string with the prefix symbol
  const lines = message.split("\n");
  const logString = lines
    .map((line, index) => {
      // Add the symbol only to the first line and keep the indentation for the rest
      const prefix = index === 0 ? `\t${symbol}` : `\t${" ".repeat(symbol.length)}`;
      return `${prefix} ${line}`;
    })
    .join("\n");

  // Adding metadata logs
  const metadataLogs = args
    .slice(1)
    .map((arg) => JSON.stringify(convertErrorsIntoObjects(arg), null, 2)) // Use 2 spaces for indentation
    .join("\n");

  // Constructing the full log string with the prefix symbol
  let fullLogString = logString;
  if (metadataLogs.trim() !== "" && !logString.includes(metadataLogs)) {
    fullLogString += "\nMetadata:\n" + metadataLogs;
  }

  const colorMap = {
    error: ["error", "fgRed"],
    ok: ["log", "fgGreen"],
    warn: ["warn", "fgYellow"],
    info: ["info", "dim"],
    debug: ["info", "dim"],
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
