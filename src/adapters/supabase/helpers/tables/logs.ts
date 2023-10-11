import { SupabaseClient } from "@supabase/supabase-js";
import Runtime from "../../../../bindings/bot-runtime";
import { LogLevel } from "../../../../types";
import { Database } from "../../types";
import { prettyLogs } from "../pretty-logs";
import { Super } from "./super";

type LogFunction = (message?: string, metadata?: unknown) => void;
type LogInsert = Database["public"]["Tables"]["logs"]["Insert"];
type _Log = {
  level: LogLevel;
  consoleLog: LogFunction;
  message: string;
  metadata?: unknown;
  postComment?: boolean;
};

export class Logs extends Super {
  private maxLevel = -1;
  private environment = "development";
  private queue: LogInsert[] = []; // Your log queue
  private concurrency = 6; // Maximum concurrent requests
  private retryDelay = 1000; // Delay between retries in milliseconds
  private throttleCount = 0;
  private retryLimit = 0; // Retries disabled by default

  constructor(supabase: SupabaseClient) {
    super(supabase);
    const runtime = Runtime.getState();
    const logConfig = runtime.botConfig.log;

    this.environment = logConfig.logEnvironment;
    this.retryLimit = logConfig.retryLimit;
    this.maxLevel = this._getNumericLevel(logConfig.level ?? LogLevel.DEBUG);
  }

  private async _sendLogsToSupabase(log: LogInsert) {
    const { error } = await this.supabase.from("logs").insert(log);
    if (error) throw prettyLogs.error("Error logging to Supabase:", error.message);
  }

  async processLogs(log: LogInsert) {
    try {
      await this._sendLogsToSupabase(log);
    } catch (error) {
      prettyLogs.error("Error sending log, retrying:", error);
      return this.retryLimit > 0 ? await this.retryLog(log) : null;
    }
  }

  async retryLog(log: LogInsert, retryCount = 0) {
    if (retryCount >= this.retryLimit) {
      prettyLogs.error("Max retry limit reached for log:", log);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, this.retryDelay));

    try {
      await this._sendLogsToSupabase(log);
    } catch (error) {
      prettyLogs.error("Error sending log (after retry):", error);
      await this.retryLog(log, retryCount + 1);
    }
  }

  async processLogQueue() {
    while (this.queue.length > 0) {
      const log = this.queue.shift();
      if (!log) {
        continue;
      }
      await this.processLogs(log);
    }
  }

  async throttle() {
    if (this.throttleCount >= this.concurrency) {
      return;
    }

    this.throttleCount++;
    try {
      await this.processLogQueue();
    } finally {
      this.throttleCount--;
      if (this.queue.length > 0) {
        await this.throttle();
      }
    }
  }

  async addToQueue(log: LogInsert) {
    this.queue.push(log);
    if (this.throttleCount < this.concurrency) {
      await this.throttle();
    }
  }

  private _save(log: LogInsert, level: LogLevel) {
    if (this._getNumericLevel(level) > this.maxLevel) return; // filter out more verbose logs according to maxLevel set in config

    this.addToQueue(log)
      .then(() => void 0)
      .catch(() => prettyLogs.error("Error adding logs to queue"));

    if (this.environment === "development") {
      prettyLogs.ok(log);
    }
  }

  private _diffColorCommentMetaData(metadata: unknown) {
    const diffHeader = "```json";
    const diffFooter = "```";

    return [diffHeader, JSON.stringify(metadata, null, 2), diffFooter].join("\n");
  }

  private _diffColorCommentMessage(type: string, message: string) {
    const diffPrefix = {
      error: "-", // - text in red
      ok: "+", // + text in green
      warn: "!", // ! text in orange
      // info: "#", // # text in gray
      // debug: "@@@@",// @@ text in purple (and bold)@@
      // error: "",
      // warn: "",
      // info: "",
      // http: "#",
      verbose: "+",
      // debug: "#",
      // silly: "#",
    };
    const selected = diffPrefix[type as keyof typeof diffPrefix];

    if (selected) {
      message = message
        .trim() // Remove leading and trailing whitespace
        .split("\n")
        .map((line) => `${selected} ${line}`)
        .join("\n");
    } else if (diffPrefix["debug" as keyof typeof diffPrefix]) {
      // debug has special formatting
      message = message
        .split("\n")
        .map((line) => `@@ ${line} @@`)
        .join("\n"); // debug: "@@@@",
    } else {
      // default to gray
      message = message
        .split("\n")
        .map((line) => `# ${line}`)
        .join("\n");
    }

    const diffHeader = "```diff";
    const diffFooter = "```";

    return [diffHeader, message, diffFooter].join("\n");
  }

  private _log({ level, consoleLog, message, metadata, postComment }: _Log): string {
    // needs to generate three versions of the information.
    // they must all first serialize the error object if it exists
    // - the comment to post on supabase (must be raw)
    // - the comment to post on github (must include diff syntax)
    // - the comment to post on the console (must be colorized)

    if (metadata) {
      metadata = convertErrorsIntoObjects(metadata);
      consoleLog(message, metadata);
      // consoleLog(message);
      // consoleLog(message.includes(JSON.stringify(metadata)) ? message : message + " " + JSON.stringify(metadata));
      if (postComment) {
        const colorizedCommentMessage = this._diffColorCommentMessage(level, message);
        const commentMetaData = this._diffColorCommentMetaData(metadata);
        // enhanced location data analytics
        this._postComment([colorizedCommentMessage, commentMetaData].join("\n"));
      }
      const toSupabase = { log: message, level, metadata: metadata } as LogInsert;
      this._save(toSupabase, level);
    } else {
      consoleLog(message);
      if (postComment) {
        // enhanced location data analytics
        this._postComment(message);
      }
      const toSupabase = { log: message, level } as LogInsert;
      this._save(toSupabase, level);
    }
    return message;
  }

  public ok(log: string, metadata?: unknown, postComment?: boolean): string {
    return this._log({ level: LogLevel.VERBOSE, consoleLog: prettyLogs.ok, message: log, metadata, postComment });
  }

  public info(log: string, metadata?: unknown, postComment?: boolean): string {
    return this._log({ level: LogLevel.INFO, consoleLog: prettyLogs.info, message: log, metadata, postComment });
  }

  public warn(log: string, metadata?: unknown, postComment?: boolean): string {
    return this._log({ level: LogLevel.WARN, consoleLog: prettyLogs.warn, message: log, metadata, postComment });
  }

  public debug(log: string, metadata?: unknown, postComment?: boolean): string {
    return this._log({ level: LogLevel.DEBUG, consoleLog: prettyLogs.debug, message: log, metadata, postComment });
  }

  public error(log: string, metadata?: unknown, postComment?: boolean): string {
    return this._log({ level: LogLevel.ERROR, consoleLog: prettyLogs.error, message: log, metadata, postComment });
  }

  private _postComment(message: string) {
    this.runtime.eventContext.octokit.issues
      .createComment({
        owner: this.runtime.eventContext.issue().owner,
        repo: this.runtime.eventContext.issue().repo,
        issue_number: this.runtime.eventContext.issue().issue_number,
        body: message,
      })
      // .then((x) => console.trace(x))
      .catch((x) => console.trace(x));
  }

  async get() {
    try {
      const { data, error } = await this.supabase.from("logs").select("*");

      if (error) {
        prettyLogs.error("Error retrieving logs from Supabase:", error.message);
        return [];
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw prettyLogs.error("An error occurred:", error.message);
      }

      prettyLogs.error("Unexpected error", error);
      return [];
    }
  }

  private _getNumericLevel(level: LogLevel) {
    switch (level) {
      case LogLevel.ERROR:
        return 0;
      case LogLevel.WARN:
        return 1;
      case LogLevel.INFO:
        return 2;
      case LogLevel.HTTP:
        return 3;
      case LogLevel.VERBOSE:
        return 4;
      case LogLevel.DEBUG:
        return 5;
      case LogLevel.SILLY:
        return 6;
      default:
        return -1; // Invalid level
    }
  }

  // function replacer(key, value) {
  //   if (value instanceof Error) {
  //     return {
  //       // Convert Error to a plain object
  //       message: value.message,
  //       name: value.name,
  //       stack: value.stack,
  //     };
  //   }
  //   return value;
  // }
}
export function prefixInformation(information: string, prefix = ""): string {
  const lines = information.split("\n");

  return lines
    .map((line) => `${prefix}${line}`) // Replace 'at' and prefix every line
    .join("\n");
}
export function convertErrorsIntoObjects(obj: unknown): unknown {
  if (obj instanceof Error) {
    return obj.stack ? obj.stack.split("\n") : ""; // split stack into lines for better readability
    // return {
    //   message: obj.message,
    //   name: obj.name,
    //   stack: obj.stack ? obj.stack.split("\n") : "", // split stack into lines for better readability
    // };
  } else if (typeof obj === "object" && obj !== null) {
    const keys = Object.keys(obj);
    keys.forEach((key) => {
      obj[key] = convertErrorsIntoObjects(obj[key]);
    });
  }
  return obj;
}
