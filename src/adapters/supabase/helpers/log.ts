import axios from "axios";
import { getAdapters, getBotContext, Logger } from "../../../bindings";
import { Payload, LogLevel, LogNotification } from "../../../types";
import { getOrgAndRepoFromPath } from "../../../utils/private";
import jwt from "jsonwebtoken";
interface Log {
  repo: string | null;
  org: string | null;
  commentId: number | undefined;
  issueNumber: number | undefined;
  logMessage: string;
  level: LogLevel;
  timestamp: string;
}

export const getNumericLevel = (level: LogLevel) => {
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
};

export class GitHubLogger implements Logger {
  private supabase;
  private maxLevel;
  private app;
  private logEnvironment;
  private logQueue: Log[] = []; // Your log queue
  private maxConcurrency = 6; // Maximum concurrent requests
  private retryDelay = 1000; // Delay between retries in milliseconds
  private throttleCount = 0;
  private retryLimit = 0; // Retries disabled by default
  private logNotification;

  constructor(app: string, logEnvironment: string, maxLevel: LogLevel, retryLimit: number, logNotification: LogNotification) {
    this.app = app;
    this.logEnvironment = logEnvironment;
    this.maxLevel = getNumericLevel(maxLevel);
    this.retryLimit = retryLimit;
    this.supabase = getAdapters().supabase;
    this.logNotification = logNotification;
  }

  async sendLogsToSupabase({ repo, org, commentId, issueNumber, logMessage, level, timestamp }: Log) {
    const { error } = await this.supabase.from("logs").insert([
      {
        repo_name: repo,
        level: getNumericLevel(level),
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
  }

  async processLogs(log: Log) {
    try {
      await this.sendLogsToSupabase(log);
    } catch (error) {
      console.error("Error sending log, retrying:", error);
      return this.retryLimit > 0 ? await this.retryLog(log) : null;
    }
  }

  private prefixLogFn = (): string | "" => {
    const frame = new Error().stack?.split("\n")[3];

    if (frame) {
      return "[" + frame?.split(" ")[5] + "] ";
    } else return "";
  };

  private sendDataWithJwt(message: string | object, errorPayload?: string | object) {
    const context = getBotContext();
    const payload = context.payload as Payload;

    const { comment, issue, repository } = payload;
    const commentId = comment?.id;
    const issueNumber = issue?.number;
    const repoFullName = repository?.full_name;

    const { org, repo } = getOrgAndRepoFromPath(repoFullName);

    const issueLink = `https://github.com/${org}/${repo}/issues/${issueNumber}${commentId ? `#issuecomment-${commentId}` : ""}`;

    return new Promise((resolve, reject) => {
      try {
        if (!this.logNotification?.enabled) {
          reject("Telegram Log Notification is disabled, please check that url, secret and group is provided");
        }

        if (typeof message === "object") {
          message = JSON.stringify(message);
        }

        if (errorPayload && typeof errorPayload === "object") {
          errorPayload = JSON.stringify(errorPayload);
        }

        const errorMessage = `\`${message}${errorPayload ? " - " + errorPayload : ""}\`\n\nContext: ${issueLink}`;

        // Step 1: Sign a JWT with the provided parameter
        const jwtToken = jwt.sign(
          {
            group: this.logNotification.groupId,
            topic: this.logNotification.topicId,
            msg: errorMessage,
          },
          this.logNotification.secret,
          { noTimestamp: true }
        );

        const apiUrl = `${this.logNotification.url}/sendLogs`;
        const headers = {
          Authorization: `${jwtToken}`,
        };

        axios
          .get(apiUrl, { headers })
          .then((response) => {
            resolve(response.data);
          })
          .catch((error) => {
            reject(error);
          });
      } catch (error) {
        // Reject the promise with the error
        reject(error);
      }
    });
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

  private save(logMessage: string | object, level: LogLevel, options?: JSON) {
    if (getNumericLevel(level) > this.maxLevel) return; // only return errors lower than max level

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

    this.addToQueue({ repo, org, commentId, issueNumber, logMessage, level, timestamp })
      .then(() => {
        return;
      })
      .catch(() => {
        console.log("Error adding logs to queue");
      });

    if (this.logEnvironment === "development") {
      console.log(this.app, logMessage, options, level, repo, org, commentId, issueNumber);
    }
  }

  info(message: string | object, payload?: JSON) {
    this.save(payload && "prefix" in payload ? this.prefixLogFn() + message : message, LogLevel.INFO, payload);
  }

  warn(message: string | object, payload?: JSON) {
    this.save(payload && "prefix" in payload ? this.prefixLogFn() + message : message, LogLevel.WARN, payload);
    this.sendDataWithJwt(message, payload)
      .then((response) => {
        this.save(`Log Notification Success: ${response}`, LogLevel.DEBUG);
      })
      .catch((error) => {
        this.save(`Log Notification Error: ${error}`, LogLevel.DEBUG);
      });
  }

  debug(message: string | object, payload?: JSON) {
    this.save(payload && "prefix" in payload ? this.prefixLogFn() + message : message, LogLevel.DEBUG, payload);
  }

  error(message: string | object, payload?: JSON) {
    this.save(payload && "prefix" in payload ? this.prefixLogFn() + message : message, LogLevel.ERROR, payload);
    this.sendDataWithJwt(message, payload)
      .then((response) => {
        this.save(`Log Notification Success: ${response}`, LogLevel.DEBUG);
      })
      .catch((error) => {
        this.save(`Log Notification Error: ${error}`, LogLevel.DEBUG);
      });
  }

  async get() {
    try {
      const { data, error } = await this.supabase.from("logs").select("*");

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
