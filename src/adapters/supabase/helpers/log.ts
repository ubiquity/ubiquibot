import Runtime from "../../../bindings/bot-runtime";
import { LogLevel, Payload } from "../../../types";
import { getOrgAndRepoFromPath } from "../../../utils/private";
import { prettyLogs } from "./pretty-logs";
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
export class GitHubLogger {
  private supabase;
  private maxLevel;
  private logEnvironment;
  private logQueue: Log[] = []; // Your log queue
  private maxConcurrency = 6; // Maximum concurrent requests
  private retryDelay = 1000; // Delay between retries in milliseconds
  private throttleCount = 0;
  private retryLimit = 0; // Retries disabled by default

  constructor(logEnvironment: string, maxLevel: LogLevel, retryLimit: number) {
    this.logEnvironment = logEnvironment;
    this.maxLevel = getNumericLevel(maxLevel);
    this.retryLimit = retryLimit;
    this.supabase = Runtime.getState().adapters.supabase;
  }

  async sendLogsToSupabase({ logMessage }: Log) {
    const { error } = await this.supabase.client.from("logs").insert({ log_entry: logMessage });

    if (error) {
      console.error("Error logging to Supabase:", error.message);
      return;
    }
  }

  async processLogs(log: Log) {
    try {
      await this.sendLogsToSupabase(log);
    } catch (error) {
      console.error("Error sending log, retrying:", error);
      return this.retryLimit > 0 ? await this.retryLog(log) : null;
    }
  }

  async retryLog(log: Log, retryCount = 0) {
    if (retryCount >= this.retryLimit) {
      console.error("Max retry limit reached for log:", log);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, this.retryDelay));

    try {
      await this.sendLogsToSupabase(log);
    } catch (error) {
      console.error("Error sending log (after retry):", error);
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

  private save(logMessage: string | object, level: LogLevel, errorPayload?: string | object) {
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
      .catch(() => console.log("Error adding logs to queue"));

    if (this.logEnvironment === "development") {
      console.log(logMessage, errorPayload, level, repo, org, commentId, issueNumber);
    }
  }

  public info(message: string | object, errorPayload?: JSON) {
    prettyLogs.info(message);
    this.save(message, LogLevel.INFO, errorPayload);
    return message;
  }

  public warn(message: string | object, errorPayload?: JSON) {
    prettyLogs.warn(message);
    this.save(message, LogLevel.WARN, errorPayload);
    return message;
  }

  public debug(message: string | object, errorPayload?: JSON) {
    prettyLogs.debug(message);
    this.save(message, LogLevel.DEBUG, errorPayload);
    return message;
  }

  public error(message: string | object, errorPayload?: JSON) {
    prettyLogs.error(message);
    this.save(message, LogLevel.ERROR, errorPayload);
    return message;
  }

  async get() {
    try {
      const { data, error } = await this.supabase.client.from("logs").select("*");

      if (error) {
        console.error("Error retrieving logs from Supabase:", error.message);
        return [];
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        // 👉️ err is type Error here
        console.error("An error occurred:", error.message);

        return;
      }

      console.log("Unexpected error", error);
      return [];
    }
  }
}
