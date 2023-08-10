import { getAdapters, getBotContext } from "../../../bindings";
import { Payload } from "../../../types";

export class GitHubLogger {
  private supabase = getAdapters().supabase;
  private app;
  private logEnvironment;
  private logQueue: any[] = []; // Your log queue
  private maxConcurrency = 5; // Maximum concurrent requests
  private retryLimit = 3; // Maximum number of retries
  private retryDelay = 1000; // Delay between retries in milliseconds
  private throttleCount = 0;

  constructor(app: string, logEnvironment: string) {
    this.app = app;
    this.logEnvironment = logEnvironment;
  }

  async sendLogsToSupabase(logs: any) {
    // Implement your logic to send logs to Supabase API here
    console.log(logs);
  }

  async processLogs(log: any) {
    try {
      await this.sendLogsToSupabase(log);
      console.log("Log sent successfully:", log);
    } catch (error) {
      console.error("Error sending log, retrying:", error);
      await this.retryLog(log);
    }
  }

  async retryLog(log: any, retryCount = 0) {
    if (retryCount >= this.retryLimit) {
      console.error("Max retry limit reached for log:", log);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, this.retryDelay));

    try {
      await this.sendLogsToSupabase(log);
      console.log("Log sent successfully (after retry):", log);
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

  async throttle(fn: any) {
    if (this.throttleCount >= this.maxConcurrency) {
      return;
    }

    this.throttleCount++;
    try {
      await fn();
    } finally {
      this.throttleCount--;
      if (this.logQueue.length > 0) {
        this.throttle(this.processLogQueue.bind(this));
      }
    }
  }

  addToQueue(log: any) {
    this.logQueue.push(log);
    if (this.throttleCount < this.maxConcurrency) {
      this.throttle(this.processLogQueue.bind(this));
    }
  }

  private async save(logMessage: string | object, errorType: string, errorPayload?: string | object) {
    const context = getBotContext();
    const payload = context.payload as Payload;
    const timestamp = Date.now();

    //this.addToQueue(logMessage)

    console.log(payload, logMessage, errorType, this.app, errorPayload, timestamp, this.logEnvironment);

    // try {
    //     const { data, error } = await this.supabase
    //     .from('log_entries')
    //     .insert([
    //         {
    //             repo_name: repoName,
    //             org_name: orgName,
    //             node_id: nodeID,
    //             comment_id: commentID,
    //             log_message: logMessage,
    //             timestamp: new Date(),
    //         },
    //     ]);

    //     if (error) {
    //         console.error('Error logging to Supabase:', error.message);
    //         return;
    //     }

    //     console.log('Log entry inserted into Supabase:', data);
    // } catch (error: any) {
    //     console.error('An error occurred:', error.message);
    // }
  }

  info(message: string | object, errorPayload?: string | object) {
    this.save(message, `info`, errorPayload);
  }

  warn(message: string | object, errorPayload?: string | object) {
    this.save(message, `warn`, errorPayload);
  }

  debug(message: string | object, errorPayload?: string | object) {
    this.save(message, `debug`, errorPayload);
  }

  error(message: string | object, errorPayload?: string | object) {
    this.save(message, `error`, errorPayload);
  }

  async get() {
    try {
      const { data, error } = await this.supabase.from("log_entries").select("*");

      if (error) {
        console.error("Error retrieving logs from Supabase:", error.message);
        return [];
      }

      return data;
    } catch (error: any) {
      console.error("An error occurred:", error.message);
      return [];
    }
  }
}
