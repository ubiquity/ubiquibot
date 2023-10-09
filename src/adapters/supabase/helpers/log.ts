import { SupabaseClient } from "@supabase/supabase-js";
import Runtime from "../../../bindings/bot-runtime";
import { LogLevel, Payload } from "../../../types";
import { getOrgAndRepoFromPath } from "../../../utils/private";
import { prettyLogs } from "./pretty-logs";
import { Super } from "./tables/super";
interface Log {
  logMessage: string;
}

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
    // this.supabase = Runtime.getState().adapters.supabase;
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

  private save(logMessage: string | object, level: LogLevel, metadata?: string | object) {
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

  private _colorComment<T extends string | object>(type: string, message: T) {
    // - text in red
    // + text in green
    // ! text in orange
    // # text in gray
    // @@ text in purple (and bold)@@

    const diffKey = {
      error: "-",
      ok: "+",
      warn: "!",
      info: "#",
      // debug: "@@@@",
    };

    const preamble = "```diff\n";
    let serializedBody;
    const postamble = "\n```";

    if (typeof message === "object") serializedBody = JSON.stringify(message);
    else serializedBody = message;

    if (!diffKey[type as keyof typeof diffKey]) serializedBody = `@@ ${serializedBody} @@`; // debug: "@@@@",
    else serializedBody = `${diffKey[type as keyof typeof diffKey]} ${serializedBody}`;

    return `${preamble}${serializedBody}${postamble}`;
  }

  public ok<T extends string | object>(message: T, metadata?: object): string {
    prettyLogs.ok(message, metadata);
    this.save(message, LogLevel.VERBOSE, metadata);
    return this._colorComment("ok", message);
  }

  public info<T extends string | object>(message: T, metadata?: object): string {
    prettyLogs.info(message, metadata);
    this.save(message, LogLevel.INFO, metadata);
    return this._colorComment("info", message);
  }

  public warn<T extends string | object>(message: T, metadata?: object): string {
    prettyLogs.warn(message, metadata);
    this.save(message, LogLevel.WARN, metadata);
    return this._colorComment("warn", message);
  }

  public debug<T extends string | object>(message: T, metadata?: object): string {
    prettyLogs.debug(message, metadata);
    this.save(message, LogLevel.DEBUG, metadata);
    return this._colorComment("debug", message);
  }

  public error<T extends string | object>(message: T, metadata?: object): string {
    prettyLogs.error(message, metadata);
    this.save(message, LogLevel.ERROR, metadata);
    return this._colorComment("error", message);
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
