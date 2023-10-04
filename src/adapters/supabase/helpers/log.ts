import { getAdapters, getBotContext, Logger } from "../../../bindings";
import { Payload, LogLevel } from "../../../types";
import { getOrgAndRepoFromPath } from "../../../utils/private";

import { Database } from "../types/database";
import { SupabaseClient } from "@supabase/supabase-js";
type Logs = Database["public"]["Tables"]["logs"];
type InsertLogs = Logs["Insert"];

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
  private logQueue: InsertLogs[] = []; // Your log queue
  private maxConcurrency = 6; // Maximum concurrent requests
  private retryDelay = 1000; // Delay between retries in milliseconds
  private throttleCount = 0;
  private retryLimit = 0; // Retries disabled by default

  constructor(logEnvironment: string, maxLevel: LogLevel, retryLimit: number) {
    this.logEnvironment = logEnvironment;
    this.maxLevel = getNumericLevel(maxLevel);
    this.retryLimit = retryLimit;
    this.supabase = getAdapters().supabase;
  }

  // async sendLogsToSupabase(log: InsertLogs) {
  //   const { error } = await this.supabase.from("logs").insert([{ ...log }]);

  //   if (error) {
  //     console.error("Error logging to Supabase:", error.message);
  //     return;
  //   }
  // }

  // Function to insert a new log entry with a GitHub node ID and type
  private async _insert({ githubNodeId, githubNodeType, logMessage }: { githubNodeId?: string; githubNodeType?: GithubNodeType; logMessage: string }) {
    let locationId: number | undefined;

    if (githubNodeId && githubNodeType) {
      // Check if a location with the same GitHub node ID and type exists
      const { data: existingLocation, error } = await this.supabase.from("locations").select("id").eq(`node_id_${githubNodeType}`, githubNodeId).single();

      if (error) {
        console.error("Error checking existing location:", error);
        return null;
      } else if (existingLocation) {
        // If the location already exists, use its ID
        locationId = existingLocation.id;
      } else {
        // If the location doesn't exist, create a new one
        const { data: newLocation, error: locationError } = await this.supabase
          .from("locations")
          .insert([{ [`node_id_${githubNodeType}`]: githubNodeId }])
          .single();

        if (locationError || !newLocation) {
          console.error("Error creating a new location:", locationError);
          return null;
        }

        locationId = (newLocation as Database["public"]["Tables"]["locations"]["Row"]).id;
      }
    }

    // Insert the log entry with the retrieved or newly created location ID
    const { data: insertedData, error: logError } = await this.supabase.from("logs").insert([
      {
        // github_node_id: githubNodeId,
        github_node_type: githubNodeType,
        log_entry: logMessage,
        location_id: locationId,
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

  private async _processLogs(log: InsertLogs) {
    try {
      await this._insert({ logMessage: log.log_entry });
    } catch (error) {
      console.error("Error sending log, retrying:", error);
      return this.retryLimit > 0 ? await this._retryInsert(log) : null;
    }
  }

  private async _retryInsert(log: InsertLogs, retryCount = 0) {
    if (retryCount >= this.retryLimit) {
      console.error("Max retry limit reached for log:", log);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, this.retryDelay));

    try {
      await this._insert({ logMessage: log.log_entry });
    } catch (error) {
      console.error("Error sending log (after retry):", error);
      await this._retryInsert(log, retryCount + 1);
    }
  }

  private async _processLogQueue() {
    while (this.logQueue.length > 0) {
      const log = this.logQueue.shift();
      if (!log) {
        continue;
      }
      await this._processLogs(log);
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

  private async _addToQueue(log: InsertLogs) {
    this.logQueue.push(log);
    if (this.throttleCount < this.maxConcurrency) {
      await this._throttle();
    }
  }

  private _save(logMessage: string | object, level: LogLevel, errorPayload?: string | object) {
    if (getNumericLevel(level) > this.maxLevel) return; // only return errors lower than max level

    const context = getBotContext();
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

    this._addToQueue({ log_entry: logMessage })
      .then(() => {
        return;
      })
      .catch(() => {
        console.log("Error adding logs to queue");
      });

    if (this.logEnvironment === "development") {
      console.log(this.app, logMessage, errorPayload, level, repo, org, commentId, issueNumber);
    }
  }

  public info(message: string | object, errorPayload?: string | object) {
    this._save(message, LogLevel.INFO, errorPayload);
  }

  public warn(message: string | object, errorPayload?: string | object) {
    this._save(message, LogLevel.WARN, errorPayload);
  }

  public debug(message: string | object, errorPayload?: string | object) {
    this._save(message, LogLevel.DEBUG, errorPayload);
  }

  public error(message: string | object, errorPayload?: string | object) {
    this._save(message, LogLevel.ERROR, errorPayload);
  }

  // private async _get() {
  //   try {
  //     const { data, error } = await this.supabase.from("logs").select("*");

  //     if (error) {
  //       console.error("Error retrieving logs from Supabase:", error.message);
  //       return [];
  //     }

  //     return data;
  //   } catch (error) {
  //     if (error instanceof Error) {
  //       console.error("An error occurred:", error.message);
  //       return;
  //     }

  //     console.log("Unexpected error", error);
  //     return [];
  //   }
  // }
}
