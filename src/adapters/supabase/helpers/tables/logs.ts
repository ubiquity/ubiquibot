import { SupabaseClient } from "@supabase/supabase-js";
import Runtime from "../../../../bindings/bot-runtime";
import { LogLevel } from "../../../../types";
import { Database, Json } from "../../types";
import { prettyLogs } from "../pretty-logs";
import { Super } from "./super";

type LogFunction = (message?: string, metadata?: unknown) => void;
type LogInsert = Database["public"]["Tables"]["logs"]["Insert"];
type _Log = {
  level: LogLevel;
  logFunction: LogFunction;
  log: string;
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
    this.maxLevel = getNumericLevel(logConfig.level ?? LogLevel.DEBUG);
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
    if (getNumericLevel(level) > this.maxLevel) return; // filter out more verbose logs according to maxLevel set in config

    this.addToQueue(log)
      .then(() => void 0)
      .catch(() => prettyLogs.error("Error adding logs to queue"));

    if (this.environment === "development") {
      prettyLogs.ok(log);
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

  private _log({ level, logFunction, log, metadata, postComment }: _Log): string {
    logFunction(log, metadata);

    this._save(
      {
        log,
        metadata: metadata as Json, // typecast for supabase
      },
      level
    );

    if (postComment) {
      this._postComment(JSON.stringify(log));
    }
    return this._colorComment(level, log);
  }

  public ok(log: string, metadata?: unknown, postComment?: boolean): string {
    return this._log({ level: LogLevel.VERBOSE, logFunction: prettyLogs.ok, log, metadata, postComment });
  }

  public info(log: string, metadata?: unknown, postComment?: boolean): string {
    return this._log({ level: LogLevel.INFO, logFunction: prettyLogs.info, log, metadata, postComment });
  }

  public warn(log: string, metadata?: unknown, postComment?: boolean): string {
    return this._log({ level: LogLevel.WARN, logFunction: prettyLogs.warn, log, metadata, postComment });
  }

  public debug(log: string, metadata?: unknown, postComment?: boolean): string {
    return this._log({ level: LogLevel.DEBUG, logFunction: prettyLogs.debug, log, metadata, postComment });
  }

  public error(log: string, metadata?: unknown, postComment?: boolean): string {
    return this._log({ level: LogLevel.ERROR, logFunction: prettyLogs.error, log, metadata, postComment });
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
