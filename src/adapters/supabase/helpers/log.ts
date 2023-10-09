import { SupabaseClient } from "@supabase/supabase-js";
import Runtime from "../../../bindings/bot-runtime";
import { LogLevel, Payload } from "../../../types";
import { getOrgAndRepoFromPath } from "../../../utils/private";
import { prettyLogs } from "./pretty-logs";
import { Super } from "./tables/super";
interface Log {
  logMessage: string;
}
type LoggerParameterFull = { [key: string]: unknown } | string; // string | { message?: string; metadata?: unknown; postComment?: boolean };

type LogFunction = (message?: string, metadata?: unknown) => void;

function getNumericLevel(level: LogLevel) {
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
export class GitHubLogger extends Super {
  // private supabase;
  private maxLevel;
  private logEnvironment;
  private logQueue: Log[] = []; // Your log queue
  private maxConcurrency = 6; // Maximum concurrent requests
  private retryDelay = 1000; // Delay between retries in milliseconds
  private throttleCount = 0;
  private retryLimit = 0; // Retries disabled by default

  constructor(supabase: SupabaseClient, logEnvironment: string, maxLevel: LogLevel, retryLimit: number) {
    super(supabase);
    this.logEnvironment = logEnvironment;
    this.maxLevel = getNumericLevel(maxLevel);
    this.retryLimit = retryLimit;
  }

  private async _sendLogsToSupabase({ logMessage }: Log) {
    const { error } = await this.supabase.from("logs").insert({ log_entry: logMessage });
    if (error) throw prettyLogs.error("Error logging to Supabase:", error.message);
  }

  async processLogs(log: Log) {
    try {
      await this._sendLogsToSupabase(log);
    } catch (error) {
      prettyLogs.error("Error sending log, retrying:", error);
      return this.retryLimit > 0 ? await this.retryLog(log) : null;
    }
  }

  async retryLog(log: Log, retryCount = 0) {
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
    while (this.logQueue.length > 0) {
      const log = this.logQueue.shift();
      if (!log) {
        continue;
      }
      await this.processLogs(log);
    }
  }

  async throttle() {
    if (this.throttleCount >= this.maxConcurrency) {
      return;
    }

    this.throttleCount++;
    try {
      await this.processLogQueue();
    } finally {
      this.throttleCount--;
      if (this.logQueue.length > 0) {
        await this.throttle();
      }
    }
  }

  async addToQueue(log: Log) {
    this.logQueue.push(log);
    if (this.throttleCount < this.maxConcurrency) {
      await this.throttle();
    }
  }

  private save(logMessage: string, level: LogLevel, metadata?: unknown) {
    if (getNumericLevel(level) > this.maxLevel) return; // only return errors lower than max level

    const runtime = Runtime.getState();
    const context = runtime.eventContext;
    const payload = context.payload as Payload;
    // const timestamp = new Date().toUTCString();

    const { comment, issue, repository } = payload;
    const commentId = comment?.id;
    const issueNumber = issue?.number;
    const repoFullName = repository?.full_name;

    const { org, repo } = getOrgAndRepoFromPath(repoFullName);

    if (!logMessage) return;

    if (typeof logMessage === "object") {
      // pass log as json stringified
      logMessage = JSON.stringify(logMessage);
    }

    this.addToQueue({ logMessage })
      .then(() => void 0)
      .catch(() => prettyLogs.error("Error adding logs to queue"));

    if (this.logEnvironment === "development") {
      prettyLogs.ok(logMessage, metadata, level, repo, org, commentId, issueNumber);
    }
  }

  private _colorComment(type: string, message: string) {
    const diffKey = {
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

    if (diffKey[type as keyof typeof diffKey]) {
      message = `${diffKey[type as keyof typeof diffKey]} ${message}`;
    } else if (diffKey["debug" as keyof typeof diffKey]) {
      message = `@@ ${message} @@`; // debug: "@@@@",
    } else {
      message = `# ${message}`;
      // console.trace(type);
    }

    const preamble = "```diff\n";
    const postamble = "\n```";

    return `${preamble}${message}${postamble}`;
  }

  private _log(level: LogLevel, logFunction: LogFunction, args: LoggerParameterFull): string {
    let serializedMessage: string;

    let metadata;
    let postComment;
    if (typeof args === "string") {
      serializedMessage = args;
    } else {
      serializedMessage = JSON.stringify(args, null, 2);
      metadata = args?.metadata;
      postComment = args?.postComment || false;
    }

    logFunction(serializedMessage, metadata);
    this.save(serializedMessage, level, metadata);
    if (postComment) {
      this._postComment(JSON.stringify(serializedMessage));
    }
    return this._colorComment(level, serializedMessage);
  }

  public ok(arg: LoggerParameterFull): string {
    return this._log(LogLevel.VERBOSE, prettyLogs.ok, arg);
  }

  public info(arg: LoggerParameterFull): string {
    return this._log(LogLevel.INFO, prettyLogs.info, arg);
  }

  public warn(arg: LoggerParameterFull): string {
    return this._log(LogLevel.WARN, prettyLogs.warn, arg);
  }

  public debug(arg: LoggerParameterFull): string {
    return this._log(LogLevel.DEBUG, prettyLogs.debug, arg);
  }

  public error(arg: LoggerParameterFull): string {
    return this._log(LogLevel.ERROR, prettyLogs.error, arg);
  }

  private _postComment(message: string) {
    this.runtime.eventContext.octokit.issues
      .createComment({
        owner: this.runtime.eventContext.issue().owner,
        repo: this.runtime.eventContext.issue().repo,
        issue_number: this.runtime.eventContext.issue().issue_number,
        body: message,
      })
      .then((x) => console.trace(x))
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
}
