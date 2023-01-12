export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName: string
          query: string
          variables: Json
          extensions: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      issues: {
        Row: {
          assignees: string[] | null
          closed_at: number | null
          comments_url: string
          completed_at: number | null
          created_at: number | null
          events_url: string
          issue_number: number
          issue_url: string
          labels: string[] | null
          price: number | null
          priority: string | null
          recipient: string | null
          started_at: number | null
          status: Database["public"]["Enums"]["issue_status"]
          timeline: string | null
          txhash: string[] | null
          updated_at: number | null
        }
        Insert: {
          assignees?: string[] | null
          closed_at?: number | null
          comments_url: string
          completed_at?: number | null
          created_at?: number | null
          events_url: string
          issue_number: number
          issue_url: string
          labels?: string[] | null
          price?: number | null
          priority?: string | null
          recipient?: string | null
          started_at?: number | null
          status?: Database["public"]["Enums"]["issue_status"]
          timeline?: string | null
          txhash?: string[] | null
          updated_at?: number | null
        }
        Update: {
          assignees?: string[] | null
          closed_at?: number | null
          comments_url?: string
          completed_at?: number | null
          created_at?: number | null
          events_url?: string
          issue_number?: number
          issue_url?: string
          labels?: string[] | null
          price?: number | null
          priority?: string | null
          recipient?: string | null
          started_at?: number | null
          status?: Database["public"]["Enums"]["issue_status"]
          timeline?: string | null
          txhash?: string[] | null
          updated_at?: number | null
        }
      }
      users: {
        Row: {
          bio: string | null
          blog: string | null
          company: string | null
          contributions: string | null
          created_at: number | null
          email: string | null
          followers: string | null
          percent_code_reviews: number | null
          percent_commits: number | null
          percent_issues: number | null
          percent_pull_requests: number | null
          public_repos: string | null
          twitter_username: string | null
          updated_at: number | null
          user_location: string | null
          user_login: string
          user_name: string
          user_type: string | null
          wallet_address: string | null
        }
        Insert: {
          bio?: string | null
          blog?: string | null
          company?: string | null
          contributions?: string | null
          created_at?: number | null
          email?: string | null
          followers?: string | null
          percent_code_reviews?: number | null
          percent_commits?: number | null
          percent_issues?: number | null
          percent_pull_requests?: number | null
          public_repos?: string | null
          twitter_username?: string | null
          updated_at?: number | null
          user_location?: string | null
          user_login: string
          user_name: string
          user_type?: string | null
          wallet_address?: string | null
        }
        Update: {
          bio?: string | null
          blog?: string | null
          company?: string | null
          contributions?: string | null
          created_at?: number | null
          email?: string | null
          followers?: string | null
          percent_code_reviews?: number | null
          percent_commits?: number | null
          percent_issues?: number | null
          percent_pull_requests?: number | null
          public_repos?: string | null
          twitter_username?: string | null
          updated_at?: number | null
          user_location?: string | null
          user_login?: string
          user_name?: string
          user_type?: string | null
          wallet_address?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      issue_status: "READY_TO_START" | "IN_PROGRESS" | "IN_REVIEW" | "DONE"
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
          owner?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner?: string | null
          updated_at?: string | null
        }
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          updated_at: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits: number
          levels: number
          offsets: number
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
