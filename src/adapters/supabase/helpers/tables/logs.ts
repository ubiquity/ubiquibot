/* eslint-disable @typescript-eslint/no-explicit-any */
// This is disabled because logs should be able to log any type of data
// Normally this is forbidden
// TODO: break this apart into smaller files.

import { SupabaseClient } from "@supabase/supabase-js";
import Runtime from "../../../../bindings/bot-runtime";
import { Database } from "../../types";
import { prettyLogs } from "../pretty-logs";
import { Super } from "./super";
import { execSync } from "child_process";

type LogFunction = (message: string, metadata?: any) => void;
type LogInsert = Database["public"]["Tables"]["logs"]["Insert"];
type _LogParams = {
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

export class Logs extends Super {
  private maxLevel = -1;
  private environment = "development";
  private queue: LogInsert[] = []; // Your log queue
  private concurrency = 6; // Maximum concurrent requests
  private retryDelay = 1000; // Delay between retries in milliseconds
  private throttleCount = 0;
  private retryLimit = 0; // Retries disabled by default

  private _log({ level, consoleLog, logMessage, metadata, postComment, type }: _LogParams) {
    // needs to generate three versions of the information.
    // they must all first serialize the error object if it exists
    // - the comment to post on supabase (must be raw)
    // - the comment to post on github (must include diff syntax)
    // - the comment to post on the console (must be colorized)

    if (metadata) {
      // metadata = Logs.convertErrorsIntoObjects(metadata);
      consoleLog(logMessage, metadata);
      if (postComment) {
        const colorizedCommentMessage = this._diffColorCommentMessage(type, logMessage);
        const commentMetaData = Logs._commentMetaData(metadata, level);
        this._postComment([colorizedCommentMessage, commentMetaData].join("\n"));
      }
      const toSupabase = { log: logMessage, level, metadata } as LogInsert;
      this._save(toSupabase, level);
    } else {
      consoleLog(logMessage);
      if (postComment) {
        const colorizedCommentMessage = this._diffColorCommentMessage(type, logMessage);
        this._postComment(colorizedCommentMessage);
      }
      const toSupabase = { log: logMessage, level } as LogInsert;
      this._save(toSupabase, level);
    }

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
      const callerLine = stackLines[3];
      const match = callerLine.match(/at (\S+)/);
      if (match) {
        metadata.caller = match[1];
      }
    }

    const gitCommit = execSync("git rev-parse --short HEAD").toString().trim();
    metadata.revision = gitCommit;

    return metadata;
  }
  public ok(log: string, metadata?: any, postComment?: boolean): LogReturn {
    metadata = this._addDiagnosticInformation(metadata);
    return this._log({
      level: LogLevel.VERBOSE,
      consoleLog: prettyLogs.ok,
      logMessage: log,
      metadata,
      postComment,
      type: "ok",
    });
  }

  public info(log: string, metadata?: any, postComment?: boolean): LogReturn {
    metadata = this._addDiagnosticInformation(metadata);
    return this._log({
      level: LogLevel.INFO,
      consoleLog: prettyLogs.info,
      logMessage: log,
      metadata,
      postComment,
      type: "info",
    });
  }

  public warn(log: string, metadata?: any, postComment?: boolean): LogReturn {
    metadata = this._addDiagnosticInformation(metadata);
    return this._log({
      level: LogLevel.WARN,
      consoleLog: prettyLogs.warn,
      logMessage: log,
      metadata,
      postComment,
      type: "warn",
    });
  }

  public debug(log: string, metadata?: any, postComment?: boolean): LogReturn {
    metadata = this._addDiagnosticInformation(metadata);
    return this._log({
      level: LogLevel.DEBUG,
      consoleLog: prettyLogs.debug,
      logMessage: log,
      metadata,
      postComment,
      type: "debug",
    });
  }

  public error(log: string, metadata?: any, postComment?: boolean): LogReturn {
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
      consoleLog: prettyLogs.error,
      logMessage: log,
      metadata,
      postComment,
      type: "error",
    });
  }

  http(log: string, metadata?: any, postComment?: boolean): LogReturn {
    metadata = this._addDiagnosticInformation(metadata);
    return this._log({
      level: LogLevel.HTTP,
      consoleLog: prettyLogs.http,
      logMessage: log,
      metadata,
      postComment,
      type: "http",
    });
  }

  verbose(log: string, metadata?: any, postComment?: boolean): LogReturn {
    metadata = this._addDiagnosticInformation(metadata);
    return this._log({
      level: LogLevel.VERBOSE,
      consoleLog: prettyLogs.verbose,
      logMessage: log,
      metadata,
      postComment,
      type: "verbose",
    });
  }

  silly(log: string, metadata?: any, postComment?: boolean): LogReturn {
    metadata = this._addDiagnosticInformation(metadata);
    return this._log({
      level: LogLevel.SILLY,
      consoleLog: prettyLogs.silly,
      logMessage: log,
      metadata,
      postComment,
      type: "silly",
    });
  }

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
    if (error) throw prettyLogs.error("Error logging to Supabase:", error);
  }

  private async _processLogs(log: LogInsert) {
    try {
      await this._sendLogsToSupabase(log);
    } catch (error) {
      prettyLogs.error("Error sending log, retrying:", error);
      return this.retryLimit > 0 ? await this._retryLog(log) : null;
    }
  }

  private async _retryLog(log: LogInsert, retryCount = 0) {
    if (retryCount >= this.retryLimit) {
      prettyLogs.error("Max retry limit reached for log:", log);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, this.retryDelay));

    try {
      await this._sendLogsToSupabase(log);
    } catch (error) {
      prettyLogs.error("Error sending log (after retry):", error);
      await this._retryLog(log, retryCount + 1);
    }
  }

  private async _processLogQueue() {
    while (this.queue.length > 0) {
      const log = this.queue.shift();
      if (!log) {
        continue;
      }
      await this._processLogs(log);
    }
  }

  private async _throttle() {
    if (this.throttleCount >= this.concurrency) {
      return;
    }

    this.throttleCount++;
    try {
      await this._processLogQueue();
    } finally {
      this.throttleCount--;
      if (this.queue.length > 0) {
        await this._throttle();
      }
    }
  }

  private async _addToQueue(log: LogInsert) {
    this.queue.push(log);
    if (this.throttleCount < this.concurrency) {
      await this._throttle();
    }
  }

  private _save(logInsert: LogInsert, logLevel: LogLevel) {
    if (this._getNumericLevel(logLevel) > this.maxLevel) return; // filter out more verbose logs according to maxLevel set in config

    this._addToQueue(logInsert)
      .then(() => void 0)
      .catch(() => prettyLogs.error("Error adding logs to queue"));

    if (this.environment === "development") {
      prettyLogs.ok(logInsert.log, logInsert);
    }
  }

  static _commentMetaData(metadata: any, level: LogLevel) {
    console.trace("the main place that metadata is being serialized as an html comment");
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
    this.runtime.latestEventContext.octokit.issues
      .createComment({
        owner: this.runtime.latestEventContext.issue().owner,
        repo: this.runtime.latestEventContext.issue().repo,
        issue_number: this.runtime.latestEventContext.issue().issue_number,
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

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  HTTP = "http",
  VERBOSE = "verbose",
  DEBUG = "debug",
  SILLY = "silly",
}
