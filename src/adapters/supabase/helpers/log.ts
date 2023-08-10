import { getAdapters, getBotContext } from "../../../bindings";
import { Payload } from "../../../types";

export class GitHubLogger {
  private supabase = getAdapters().supabase;
  private app;

  constructor(app: string) {
    this.app = app;
  }

  async save(logMessage: string) {
    const context = getBotContext();

    const payload = context.payload as Payload;

    console.log(payload, logMessage);

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
