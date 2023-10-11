export const prettyLogs = {
  error: function errorLog(...args: unknown[]) {
    if (args[0] instanceof Error) {
      console.error(args[0]);
      if (args[0].stack) {
        _log("error", formatStackTrace(args[0].stack, 3)); // Log the formatted stack trace
      }
      return;
    }

    _log("error", ...args);
  },

  ok: function okLog(...args: unknown[]) {
    _log("ok", ...args);
  },

  warn: function warnLog(...args: unknown[]) {
    _log("warn", ...args);
    const stack = new Error().stack;
    if (stack) _log("warn", formatStackTrace(stack, 3)); // Log the formatted stack trace
  },

  info: function infoLog(...args: unknown[]) {
    _log("info", ...args);
  },

  debug: function debugLog(...args: unknown[]) {
    _log("debug", ...args);
    const stack = new Error().stack;
    if (stack) _log("debug", formatStackTrace(stack, 3)); // Log the formatted stack trace
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
  const message = messageArgs.map((arg) => {
    if (typeof arg === "string") {
      return arg;
    } else {
      return JSON.stringify(arg, null, "  ");
    }
  });

  // Constructing the full log string with the prefix symbol
  const lines = message;
  const logString = lines
    .map((line, index) => {
      // Add the symbol only to the first line and keep the indentation for the rest
      const prefix = index === 0 ? `\t${symbol}` : `\t${" ".repeat(symbol.length)}`;
      return `${prefix} ${line}`;
    })
    .join("\n");

  const colorMap = {
    error: ["trace", "fgRed"],
    ok: ["log", "fgGreen"],
    warn: ["warn", "fgYellow"],
    info: ["info", "dim"],
    debug: ["info", "dim"],
  };

  const _console = console[colorMap[type][0] as keyof typeof console] as (...args: string[]) => void;

  if (typeof _console === "function") {
    _console(colorizeText(logString, colorMap[type][1] as keyof typeof colors));
  } else {
    console.trace(logString);
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
    .map((line) => `\t${prefix}${line.replace(/\s*at\s*/, "")}`) // Replace 'at' and prefix every line
    .join("\n");
}
