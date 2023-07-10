export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      access: {
        Row: {
          created_at: string | null;
          multiplier_access: boolean | null;
          price_access: boolean | null;
          priority_access: boolean | null;
          repository: string | null;
          time_access: boolean | null;
          updated_at: string | null;
          user_name: string;
        };
        Insert: {
          created_at?: string | null;
          multiplier_access?: boolean | null;
          price_access?: boolean | null;
          priority_access?: boolean | null;
          repository?: string | null;
          time_access?: boolean | null;
          updated_at?: string | null;
          user_name: string;
        };
        Update: {
          created_at?: string | null;
          multiplier_access?: boolean | null;
          price_access?: boolean | null;
          priority_access?: boolean | null;
          repository?: string | null;
          time_access?: boolean | null;
          updated_at?: string | null;
          user_name?: string;
        };
        Relationships: [];
      };
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
        Relationships: [];
      };
      penalty: {
        Row: {
          amount: string;
          repository_name: string;
          token_address: string;
          username: string;
        };
        Insert: {
          amount?: string;
          repository_name: string;
          token_address: string;
          username: string;
        };
        Update: {
          amount?: string;
          repository_name?: string;
          token_address?: string;
          username?: string;
        };
        Relationships: [];
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
        Relationships: [];
      };
      wallets: {
        Row: {
          created_at: string | null;
          multiplier: number | null;
          reason: string | null;
          updated_at: string | null;
          user_name: string;
          wallet_address: string | null;
        };
        Insert: {
          created_at?: string | null;
          multiplier?: number | null;
          reason?: string | null;
          updated_at?: string | null;
          user_name: string;
          wallet_address?: string | null;
        };
        Update: {
          created_at?: string | null;
          multiplier?: number | null;
          reason?: string | null;
          updated_at?: string | null;
          user_name?: string;
          wallet_address?: string | null;
        };
        Relationships: [];
      };
      weekly: {
        Row: {
          created_at: string | null;
          last_time: string | null;
        };
        Insert: {
          created_at?: string | null;
          last_time?: string | null;
        };
        Update: {
          created_at?: string | null;
          last_time?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_penalty: {
        Args: {
          username: string;
          repository_name: string;
          token_address: string;
          penalty_amount: string;
        };
        Returns: string;
      };
      deduct_penalty: {
        Args: {
          username: string;
          repository_name: string;
          token_address: string;
          penalty_amount: string;
        };
        Returns: string;
      };
    };
    Enums: {
      issue_status: "READY_TO_START" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          public: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "buckets_owner_fkey";
            columns: ["owner"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [];
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
          version: string | null;
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
          version?: string | null;
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
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey";
            columns: ["bucket_id"];
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "objects_owner_fkey";
            columns: ["owner"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_insert_object: {
        Args: {
          bucketid: string;
          name: string;
          owner: string;
          metadata: Json;
        };
        Returns: undefined;
      };
      extension: {
        Args: {
          name: string;
        };
        Returns: string;
      };
      filename: {
        Args: {
          name: string;
        };
        Returns: string;
      };
      foldername: {
        Args: {
          name: string;
        };
        Returns: unknown;
      };
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>;
        Returns: {
          size: number;
          bucket_id: string;
        }[];
      };
      search: {
        Args: {
          prefix: string;
          bucketname: string;
          limits?: number;
          levels?: number;
          offsets?: number;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
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
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
