import axios from "axios";
import { getAdapters, getBotContext, Logger } from "../../../bindings";
import { Payload, LogLevel, LogNotification } from "../../../types";
import { getOrgAndRepoFromPath } from "../../../utils/private";

import { Database } from "../types/database";
import { SupabaseClient } from "@supabase/supabase-js";
import { GitHubNode } from "./client";
type Logs = Database["public"]["Tables"]["logs"];
type LogEntry = Logs["Insert"]["log_entry"];
import jwt from "jsonwebtoken";

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
  private supabase: SupabaseClient<Database>;
  private maxLevel;
  private logEnvironment;
  private logQueue: LogEntry[] = []; // Your log queue
  private maxConcurrency = 6; // Maximum concurrent requests
  private retryDelay = 1000; // Delay between retries in milliseconds
  private throttleCount = 0;
  private retryLimit = 0; // Retries disabled by default
  private logNotification;

  constructor(logEnvironment: string, maxLevel: LogLevel, retryLimit: number, logNotification: LogNotification) {
    this.logEnvironment = logEnvironment;
    this.maxLevel = getNumericLevel(maxLevel);
    this.retryLimit = retryLimit;
    this.supabase = getAdapters().supabase.client;
    this.logEnvironment = logEnvironment;
    this.maxLevel = getNumericLevel(maxLevel);
    this.retryLimit = retryLimit;
    this.logNotification = logNotification;
  }

  // async sendLogsToSupabase(log: LogEntry) {
  //   const { error } = await this.supabase.from("logs").insert([{ ...log }]);

  //   if (error) {
  //     console.error("Error logging to Supabase:", error.message);
  //     return;
  //   }
  // }

  // Function to insert a new log entry with a GitHub node ID and type
  private async _insert({ gitHubNode, logEntry }: { gitHubNode: GitHubNode | null; logEntry: string }) {
    let id, type, url;

    if (gitHubNode) {
      id = gitHubNode.id;
      type = gitHubNode.type;
      url = gitHubNode.url;
    }

    const { data: insertedData, error: logError } = await this.supabase.from("logs").insert([
      {
        node_id: id,
        node_type: type,
        node_url: url,
        log_entry: logEntry,
      },
    ]);

    if (logError) {
      console.error("Error inserting log entry:", logError);
      return null;
    } else {
      console.log("Inserted data:", insertedData);
      return insertedData;
    }
  }

  private async _processLogs({ log, gitHubNode = null }: { log: LogEntry; gitHubNode?: GitHubNode | null }) {
    try {
      await this._insert({
        gitHubNode,
        logEntry: log,
      });
    } catch (error) {
      console.error("Error sending log, retrying:", error);
      return this.retryLimit > 0 ? await this._retryInsert(log) : null;
    }
  }

  private async _retryInsert(message: LogEntry) {
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

        // if && typeo === "object") {
        //  = JSON.stringif);
        // }

        // const errorMessage = `\`${message} ? " - "  : ""}\`\n\nContext: ${issueLink}`;

        // Step 1: Sign a JWT with the provided parameter
        const jwtToken = jwt.sign(
          {
            group: this.logNotification.groupId,
            topic: this.logNotification.topicId,
            msg: message.concat(" ").concat(issueLink),
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

  async retryLog(log: LogEntry, retryCount = 0) {
    if (retryCount >= this.retryLimit) {
      console.error("Max retry limit reached for log:", log);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, this.retryDelay));

    try {
      await this._insert({ logEntry: log, gitHubNode: null });
    } catch (error) {
      console.error("Error sending log (after retry):", error);
      await this._retryInsert(log);
    }
  }

  private async _processLogQueue() {
    while (this.logQueue.length > 0) {
      const log = this.logQueue.shift();
      if (!log) {
        continue;
      }
      await this._processLogs({ log });
    }
  }

  private async _throttle() {
    if (this.throttleCount >= this.maxConcurrency) {
      return;
    }

    this.throttleCount++;
    try {
      await this._processLogQueue();
    } finally {
      this.throttleCount--;
      if (this.logQueue.length > 0) {
        await this._throttle();
      }
    }
  }

  private async _addToQueue(log: LogEntry) {
    this.logQueue.push(log);
    if (this.throttleCount < this.maxConcurrency) {
      await this._throttle();
    }
  }

  private _save(logEntry: string | object, level: LogLevel) {
    if (getNumericLevel(level) > this.maxLevel) return; // only return errors lower than max level

    const context = getBotContext();
    const payload = context.payload as Payload;
    // const timestamp = new Date().toUTCString();

    const { comment, issue, repository } = payload;
    const commentId = comment?.id;
    const issueNumber = issue?.number;
    const repoFullName = repository?.full_name;

    const { org, repo } = getOrgAndRepoFromPath(repoFullName);

    if (!logEntry) return;

    if (typeof logEntry === "object") {
      // pass log as json stringified
      logEntry = JSON.stringify(logEntry);
    }

    this._addToQueue(logEntry)
      .then(() => {
        return;
      })
      .catch(() => {
        console.log("Error adding logs to queue");
      });

    if (this.logEnvironment === "development") {
      console.log(logEntry, level, repo, org, commentId, issueNumber);
    }
  }

  public info(message: string) {
    this._save(message, LogLevel.INFO);
    if (typeof message === "object") message = JSON.stringify(message);
    return message;
  }

  public warn(message: string) {
    this._save(message, LogLevel.WARN);
    this.telegramLog(message).finally(() => {});
    if (typeof message === "object") message = JSON.stringify(message);
    return message;
  }

  private telegramLog(message: string) {
    const response = this._retryInsert(message);
    return response;
  }

  public debug(message: string) {
    this._save(message, LogLevel.DEBUG);
    if (typeof message === "object") message = JSON.stringify(message);
    return message;
  }

  public error(message: string) {
    this._save(message, LogLevel.ERROR);
    this.telegramLog(message)
      .then((response) => this._save(`Log Notification Success: ${response}`, LogLevel.DEBUG))
      .catch((error) => this._save(`Log Notification Error: ${error}`, LogLevel.DEBUG));
    if (typeof message === "object") message = JSON.stringify(message);
    return message;
  }
}
