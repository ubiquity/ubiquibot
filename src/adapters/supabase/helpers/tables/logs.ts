/* eslint-disable @typescript-eslint/no-explicit-any */
// This is disabled because logs should be able to log any type of data
// Normally this is forbidden
// TODO: break this apart into smaller files.

import { SupabaseClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import { Context as ProbotContext } from "probot";
import Runtime from "../../../../bindings/bot-runtime";
import { Database } from "../../types";
import { LogLevel, PrettyLogs } from "../pretty-logs";

type LogFunction = (message: string, metadata?: any) => void;
type LogInsert = Database["public"]["Tables"]["logs"]["Insert"];
type LogParams = {
  level: LogLevel;
  consoleLog: LogFunction;
  logMessage: string;
  metadata?: any;
  postComment?: boolean;
  type: PublicMethods<Logs>;
};
export class LogReturn {
  logMessage: LogMessage;
  metadata?: any;

  constructor(logMessage: LogMessage, metadata?: any) {
    this.logMessage = logMessage;
    this.metadata = metadata;
  }
}

type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type PublicMethods<T> = Exclude<FunctionPropertyNames<T>, "constructor" | keyof object>;

export type LogMessage = { raw: string; diff: string; level: LogLevel; type: PublicMethods<Logs> };

export class Logs {
  private _supabase: SupabaseClient;
  private _context: ProbotContext | null = null;

  private _maxLevel = -1;
  private _environment = "development";
  private _queue: LogInsert[] = []; // Your log queue
  private _concurrency = 6; // Maximum concurrent requests
  private _retryDelay = 1000; // Delay between retries in milliseconds
  private _throttleCount = 0;
  private _retryLimit = 0; // Retries disabled by default

  console = new PrettyLogs();

  private _log({ level, consoleLog, logMessage, metadata, postComment, type }: LogParams): LogReturn | null {
    if (this._getNumericLevel(level) > this._maxLevel) return null; // filter out more verbose logs according to maxLevel set in config

    // needs to generate three versions of the information.
    // they must all first serialize the error object if it exists
    // - the comment to post on supabase (must be raw)
    // - the comment to post on github (must include diff syntax)
    // - the comment to post on the console (must be colorized)

    consoleLog(logMessage, metadata || undefined);

    if (this._context && postComment) {
      const colorizedCommentMessage = this._diffColorCommentMessage(type, logMessage);
      const commentMetaData = metadata ? Logs._commentMetaData(metadata, level) : null;
      this._postComment(metadata ? [colorizedCommentMessage, commentMetaData].join("\n") : colorizedCommentMessage);
    }

    const toSupabase = { log: logMessage, level, metadata } as LogInsert;

    this._save(toSupabase);

    return new LogReturn(
      {
        raw: logMessage,
        diff: this._diffColorCommentMessage(type, logMessage),
        type,
        level,
      },
      metadata
    );
  }
  private _addDiagnosticInformation(metadata: any) {
    // this is a utility function to get the name of the function that called the log
    // I have mixed feelings on this because it manipulates metadata later possibly without the developer understanding why and where,
    // but seems useful for the metadata parser to understand where the comment originated from

    // console.trace({ metadata });

    if (!metadata) {
      metadata = {};
    }
    if (typeof metadata == "string" || typeof metadata == "number") {
      // TODO: think i need to support every data type
      metadata = { message: metadata };
    }

    const stackLines = new Error().stack?.split("\n") || [];
    if (stackLines.length > 3) {
      const callerLine = stackLines[3]; // .replace(process.cwd(), "");
      const match = callerLine.match(/at (\S+)/);
      if (match) {
        metadata.caller = match[1];
      }
    }

    const gitCommit = execSync("git rev-parse --short HEAD").toString().trim();
    metadata.revision = gitCommit;

    return metadata;
  }

  public ok(log: string, metadata?: any, postComment?: boolean): LogReturn | null {
    metadata = this._addDiagnosticInformation(metadata);
    return this._log({
      level: LogLevel.VERBOSE,
      consoleLog: this.console.ok,
      logMessage: log,
      metadata,
      postComment,
      type: "ok",
    });
  }

  public info(log: string, metadata?: any, postComment?: boolean): LogReturn | null {
    metadata = this._addDiagnosticInformation(metadata);
    return this._log({
      level: LogLevel.INFO,
      consoleLog: this.console.info,
      logMessage: log,
      metadata,
      postComment,
      type: "info",
    });
  }

  public warn(log: string, metadata?: any, postComment?: boolean): LogReturn | null {
    metadata = this._addDiagnosticInformation(metadata);
    return this._log({
      level: LogLevel.WARN,
      consoleLog: this.console.warn,
      logMessage: log,
      metadata,
      postComment,
      type: "warn",
    });
  }

  public debug(log: string, metadata?: any, postComment?: boolean): LogReturn | null {
    metadata = this._addDiagnosticInformation(metadata);
    return this._log({
      level: LogLevel.DEBUG,
      consoleLog: this.console.debug,
      logMessage: log,
      metadata,
      postComment,
      type: "debug",
    });
  }

  public error(log: string, metadata?: any, postComment?: boolean): LogReturn | null {
    if (!metadata) {
      metadata = Logs.convertErrorsIntoObjects(new Error(log));
      const stack = metadata.stack as string[];
      stack.splice(1, 1);
      metadata.stack = stack;
    }
    if (metadata instanceof Error) {
      metadata = Logs.convertErrorsIntoObjects(metadata);
      const stack = metadata.stack as string[];
      stack.splice(1, 1);
      metadata.stack = stack;
    }

    metadata = this._addDiagnosticInformation(metadata);
    return this._log({
      level: LogLevel.ERROR,
      consoleLog: this.console.error,
      logMessage: log,
      metadata,
      postComment,
      type: "error",
    });
  }

  http(log: string, metadata?: any, postComment?: boolean): LogReturn | null {
    metadata = this._addDiagnosticInformation(metadata);
    return this._log({
      level: LogLevel.HTTP,
      consoleLog: this.console.http,
      logMessage: log,
      metadata,
      postComment,
      type: "http",
    });
  }

  verbose(log: string, metadata?: any, postComment?: boolean): LogReturn | null {
    metadata = this._addDiagnosticInformation(metadata);
    return this._log({
      level: LogLevel.VERBOSE,
      consoleLog: this.console.verbose,
      logMessage: log,
      metadata,
      postComment,
      type: "verbose",
    });
  }

  silly(log: string, metadata?: any, postComment?: boolean): LogReturn | null {
    metadata = this._addDiagnosticInformation(metadata);
    return this._log({
      level: LogLevel.SILLY,
      consoleLog: this.console.silly,
      logMessage: log,
      metadata,
      postComment,
      type: "silly",
    });
  }

  constructor(
    supabase: SupabaseClient,
    environment: string,
    retryLimit: number,
    logLevel: LogLevel,
    context: ProbotContext | null
  ) {
    this._supabase = supabase;
    this._context = context;
    this._environment = environment;
    this._retryLimit = retryLimit;
    this._maxLevel = this._getNumericLevel(logLevel);
  }

  private async _sendLogsToSupabase(log: LogInsert) {
    const { error } = await this._supabase.from("logs").insert(log);
    if (error) throw this.console.error("Error logging to Supabase:", error);
  }

  private async _processLogs(log: LogInsert) {
    try {
      await this._sendLogsToSupabase(log);
    } catch (error) {
      this.console.error("Error sending log, retrying:", error);
      return this._retryLimit > 0 ? await this._retryLog(log) : null;
    }
  }

  private async _retryLog(log: LogInsert, retryCount = 0) {
    if (retryCount >= this._retryLimit) {
      this.console.error("Max retry limit reached for log:", log);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, this._retryDelay));

    try {
      await this._sendLogsToSupabase(log);
    } catch (error) {
      this.console.error("Error sending log (after retry):", error);
      await this._retryLog(log, retryCount + 1);
    }
  }

  private async _processLogQueue() {
    while (this._queue.length > 0) {
      const log = this._queue.shift();
      if (!log) {
        continue;
      }
      await this._processLogs(log);
    }
  }

  private async _throttle() {
    if (this._throttleCount >= this._concurrency) {
      return;
    }

    this._throttleCount++;
    try {
      await this._processLogQueue();
    } finally {
      this._throttleCount--;
      if (this._queue.length > 0) {
        await this._throttle();
      }
    }
  }

  private async _addToQueue(log: LogInsert) {
    this._queue.push(log);
    if (this._throttleCount < this._concurrency) {
      await this._throttle();
    }
  }

  private _save(logInsert: LogInsert) {
    this._addToQueue(logInsert)
      .then(() => void 0)
      .catch(() => this.console.error("Error adding logs to queue"));

    if (this._environment === "development") {
      this.console.ok(logInsert.log, logInsert);
    }
  }

  static _commentMetaData(metadata: any, level: LogLevel) {
    Runtime.getState().logger.debug("the main place that metadata is being serialized as an html comment");
    const prettySerialized = JSON.stringify(metadata, null, 2);
    // first check if metadata is an error, then post it as a json comment
    // otherwise post it as an html comment
    if (level === LogLevel.ERROR) {
      return ["```json", prettySerialized, "```"].join("\n");
    } else {
      return ["<!--", prettySerialized, "-->"].join("\n");
    }
  }

  private _diffColorCommentMessage(type: string, message: string) {
    const diffPrefix = {
      error: "-", // - text in red
      ok: "+", // + text in green
      warn: "!", // ! text in orange
      // info: "#", // # text in gray
      // debug: "@@@@",// @@ text in purple (and bold)@@
      // error: null,
      // warn: null,
      // info: null,
      // http: "#",
      // verbose: "#",
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
    } else if (type === "debug") {
      // debug has special formatting
      message = message
        .split("\n")
        .map((line) => `@@ ${line} @@`)
        .join("\n"); // debug: "@@@@",
    } else {
      // console.trace("unknown log type", type);
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

  private _postComment(message: string) {
    // post on issue
    if (!this._context) return;
    this._context.octokit.issues
      .createComment({
        owner: this._context.issue().owner,
        repo: this._context.issue().repo,
        issue_number: this._context.issue().issue_number,
        body: message,
      })
      // .then((x) => console.trace(x))
      .catch((x) => console.trace(x));
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
  static convertErrorsIntoObjects(obj: any): any {
    // this is a utility function to render native errors in the console, the database, and on GitHub.
    if (obj instanceof Error) {
      return {
        message: obj.message,
        name: obj.name,
        stack: obj.stack ? obj.stack.split("\n") : null,
      };
    } else if (typeof obj === "object" && obj !== null) {
      const keys = Object.keys(obj);
      keys.forEach((key) => {
        obj[key] = this.convertErrorsIntoObjects(obj[key]);
      });
    }
    return obj;
  }
}
