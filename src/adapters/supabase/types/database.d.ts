export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName: string;
          query: string;
          variables: Json;
          extensions: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      issues: {
        Row: {
          assignees: string[] | null;
          closed_at: string | null;
          comments_url: string;
          completed_at: string | null;
          created_at: string | null;
          events_url: string;
          id: number;
          issue_number: number;
          issue_url: string;
          labels: string[] | null;
          price: string | null;
          priority: string | null;
          recipient: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["issue_status"];
          timeline: string | null;
          txhash: string[] | null;
          updated_at: string | null;
        };
        Insert: {
          assignees?: string[] | null;
          closed_at?: string | null;
          comments_url: string;
          completed_at?: string | null;
          created_at?: string | null;
          events_url: string;
          id?: number;
          issue_number: number;
          issue_url: string;
          labels?: string[] | null;
          price?: string | null;
          priority?: string | null;
          recipient?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["issue_status"];
          timeline?: string | null;
          txhash?: string[] | null;
          updated_at?: string | null;
        };
        Update: {
          assignees?: string[] | null;
          closed_at?: string | null;
          comments_url?: string;
          completed_at?: string | null;
          created_at?: string | null;
          events_url?: string;
          id?: number;
          issue_number?: number;
          issue_url?: string;
          labels?: string[] | null;
          price?: string | null;
          priority?: string | null;
          recipient?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["issue_status"];
          timeline?: string | null;
          txhash?: string[] | null;
          updated_at?: string | null;
        };
      };
      users: {
        Row: {
          bio: string | null;
          blog: string | null;
          company: string | null;
          contributions: string | null;
          created_at: string | null;
          email: string | null;
          followers: number | null;
          following: number | null;
          percent_code_reviews: number | null;
          percent_commits: number | null;
          percent_issues: number | null;
          percent_pull_requests: number | null;
          public_repos: number | null;
          twitter_username: string | null;
          updated_at: string | null;
          user_location: string | null;
          user_login: string;
          user_name: string;
          user_type: string | null;
          wallet_address: string | null;
        };
        Insert: {
          bio?: string | null;
          blog?: string | null;
          company?: string | null;
          contributions?: string | null;
          created_at?: string | null;
          email?: string | null;
          followers?: number | null;
          following?: number | null;
          percent_code_reviews?: number | null;
          percent_commits?: number | null;
          percent_issues?: number | null;
          percent_pull_requests?: number | null;
          public_repos?: number | null;
          twitter_username?: string | null;
          updated_at?: string | null;
          user_location?: string | null;
          user_login: string;
          user_name: string;
          user_type?: string | null;
          wallet_address?: string | null;
        };
        Update: {
          bio?: string | null;
          blog?: string | null;
          company?: string | null;
          contributions?: string | null;
          created_at?: string | null;
          email?: string | null;
          followers?: number | null;
          following?: number | null;
          percent_code_reviews?: number | null;
          percent_commits?: number | null;
          percent_issues?: number | null;
          percent_pull_requests?: number | null;
          public_repos?: number | null;
          twitter_username?: string | null;
          updated_at?: string | null;
          user_location?: string | null;
          user_login?: string;
          user_name?: string;
          user_type?: string | null;
          wallet_address?: string | null;
        };
      };
      wallets: {
        Row: {
          created_at: string | null;
          updated_at: string | null;
          user_name: string;
          wallet_address: string | null;
        };
        Insert: {
          created_at?: string | null;
          updated_at?: string | null;
          user_name: string;
          wallet_address?: string | null;
        };
        Update: {
          created_at?: string | null;
          updated_at?: string | null;
          user_name?: string;
          wallet_address?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      issue_status: "READY_TO_START" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          owner: string | null;
          public: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id: string;
          name: string;
          owner?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          owner?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      extension: {
        Args: { name: string };
        Returns: string;
      };
      filename: {
        Args: { name: string };
        Returns: string;
      };
      foldername: {
        Args: { name: string };
        Returns: string[];
      };
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>;
        Returns: { size: number; bucket_id: string }[];
      };
      search: {
        Args: {
          prefix: string;
          bucketname: string;
          limits: number;
          levels: number;
          offsets: number;
          search: string;
          sortcolumn: string;
          sortorder: string;
        };
        Returns: {
          name: string;
          id: string;
          updated_at: string;
          created_at: string;
          last_accessed_at: string;
          metadata: Json;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
