import { getAdapters, getBotContext, Logger } from "../../../bindings";
import { Payload } from "../../../types";
import { getOrgAndRepoFromPath } from "../../../utils/private";
interface Log {
  repo: string | null;
  org: string | null;
  commentId: number | undefined;
  issueNumber: number | undefined;
  logMessage: string;
  errorType: levels;
  timestamp: string;
}

export enum levels {
  error = 0,
  warn = 1,
  info = 2,
  http = 3,
  verbose = 4,
  debug = 5,
  silly = 6,
}

export class GitHubLogger implements Logger {
  private supabase = getAdapters().supabase;
  private maxLevel;
  private app;
  private logEnvironment;
  private logQueue: Log[] = []; // Your log queue
  private maxConcurrency = 5; // Maximum concurrent requests
  private retryLimit = 3; // Maximum number of retries
  private retryDelay = 1000; // Delay between retries in milliseconds
  private throttleCount = 0;

  constructor(app: string, logEnvironment: string, maxLevel: keyof typeof levels) {
    this.app = app;
    this.logEnvironment = logEnvironment;
    this.maxLevel = levels[maxLevel];
  }

  async sendLogsToSupabase({ repo, org, commentId, issueNumber, logMessage, errorType, timestamp }: Log) {
    try {
      const { error } = await this.supabase.from("log_entries").insert([
        {
          repo_name: repo,
          level: errorType,
          org_name: org,
          comment_id: commentId,
          log_message: logMessage,
          issue_number: issueNumber,
          timestamp,
        },
      ]);

      if (error) {
        console.error("Error logging to Supabase:", error.message);
        return;
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("An error occurred:", error.message);
      }
    }
  }

  async processLogs(log: Log) {
    try {
      await this.sendLogsToSupabase(log);
    } catch (error) {
      console.error("Error sending log, retrying:", error);
      await this.retryLog(log);
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

  async throttle(fn: () => void) {
    if (this.throttleCount >= this.maxConcurrency) {
      return;
    }

    this.throttleCount++;
    try {
      await fn();
    } finally {
      this.throttleCount--;
      if (this.logQueue.length > 0) {
        await this.throttle(this.processLogQueue.bind(this));
      }
    }
  }

  async addToQueue(log: Log) {
    this.logQueue.push(log);
    if (this.throttleCount < this.maxConcurrency) {
      await this.throttle(this.processLogQueue.bind(this));
    }
  }

  private save(logMessage: string | object, errorType: number, errorPayload?: string | object) {
    if (errorType > this.maxLevel) return; // only return errors lower than max level

    const context = getBotContext();
    const payload = context.payload as Payload;
    const timestamp = new Date().toUTCString();

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

    this.addToQueue({ repo, org, commentId, issueNumber, logMessage, errorType, timestamp })
      .then(() => {
        return;
      })
      .catch(() => {
        console.log("Error adding logs to queue");
      });

    if (this.logEnvironment === "development") {
      console.log(this.app, logMessage, errorPayload);
    }
  }

  info(message: string | object, errorPayload?: string | object) {
    this.save(message, levels.info, errorPayload);
  }

  warn(message: string | object, errorPayload?: string | object) {
    this.save(message, levels.warn, errorPayload);
  }

  debug(message: string | object, errorPayload?: string | object) {
    this.save(message, levels.debug, errorPayload);
  }

  error(message: string | object, errorPayload?: string | object) {
    this.save(message, levels.error, errorPayload);
  }

  async get() {
    try {
      const { data, error } = await this.supabase.from("log_entries").select("*");

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
