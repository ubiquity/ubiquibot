export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      access: {
        Row: {
          created: string | null;
          id: number;
          labels: Json | null;
          location_id: number;
          multiplier: number;
          updated: string | null;
          user_id: number;
        };
        Insert: {
          created?: string | null;
          id?: number;
          labels?: Json | null;
          location_id: number;
          multiplier?: number;
          updated?: string | null;
          user_id: number;
        };
        Update: {
          created?: string | null;
          id?: number;
          labels?: Json | null;
          location_id?: number;
          multiplier?: number;
          updated?: string | null;
          user_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "access_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "location";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      credits: {
        Row: {
          amount: number;
          created: string | null;
          id: number;
          permit_id: number | null;
          updated: string | null;
        };
        Insert: {
          amount: number;
          created?: string | null;
          id?: number;
          permit_id?: number | null;
          updated?: string | null;
        };
        Update: {
          amount?: number;
          created?: string | null;
          id?: number;
          permit_id?: number | null;
          updated?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "credits_permit_id_fkey";
            columns: ["permit_id"];
            referencedRelation: "permits";
            referencedColumns: ["id"];
          }
        ];
      };
      debits: {
        Row: {
          amount: number;
          created: string | null;
          id: number;
          location_id: number | null;
          updated: string | null;
        };
        Insert: {
          amount: number;
          created?: string | null;
          id?: number;
          location_id?: number | null;
          updated?: string | null;
        };
        Update: {
          amount?: number;
          created?: string | null;
          id?: number;
          location_id?: number | null;
          updated?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "debits_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "location";
            referencedColumns: ["id"];
          }
        ];
      };
      location: {
        Row: {
          created: string | null;
          id: number;
          node_id_comment: string | null;
          node_id_issue: string | null;
          node_id_organization: string | null;
          node_id_repository: string | null;
          updated: string | null;
          url: string | null;
        };
        Insert: {
          created?: string | null;
          id?: number;
          node_id_comment?: string | null;
          node_id_issue?: string | null;
          node_id_organization?: string | null;
          node_id_repository?: string | null;
          updated?: string | null;
          url?: string | null;
        };
        Update: {
          created?: string | null;
          id?: number;
          node_id_comment?: string | null;
          node_id_issue?: string | null;
          node_id_organization?: string | null;
          node_id_repository?: string | null;
          updated?: string | null;
          url?: string | null;
        };
        Relationships: [];
      };
      logs: {
        Row: {
          created: string | null;
          id: number;
          location_id: number | null;
          log_entry: string;
          updated: string | null;
        };
        Insert: {
          created?: string | null;
          id?: number;
          location_id?: number | null;
          log_entry: string;
          updated?: string | null;
        };
        Update: {
          created?: string | null;
          id?: number;
          location_id?: number | null;
          log_entry?: string;
          updated?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "logs_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "location";
            referencedColumns: ["id"];
          }
        ];
      };
      partners: {
        Row: {
          created: string | null;
          id: number;
          location_id: number;
          updated: string | null;
          wallet_id: number | null;
        };
        Insert: {
          created?: string | null;
          id?: number;
          location_id: number;
          updated?: string | null;
          wallet_id?: number | null;
        };
        Update: {
          created?: string | null;
          id?: number;
          location_id?: number;
          updated?: string | null;
          wallet_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "partners_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "location";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partners_wallet_id_fkey";
            columns: ["wallet_id"];
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          }
        ];
      };
      permits: {
        Row: {
          amount: number | null;
          beneficiary_id: number;
          created: string | null;
          deadline: number;
          id: number;
          location_id: number | null;
          nonce: number;
          partner_id: number | null;
          signature: string;
          token_id: number | null;
          transaction: string | null;
          updated: string | null;
        };
        Insert: {
          amount?: number | null;
          beneficiary_id: number;
          created?: string | null;
          deadline: number;
          id?: number;
          location_id?: number | null;
          nonce: number;
          partner_id?: number | null;
          signature: string;
          token_id?: number | null;
          transaction?: string | null;
          updated?: string | null;
        };
        Update: {
          amount?: number | null;
          beneficiary_id?: number;
          created?: string | null;
          deadline?: number;
          id?: number;
          location_id?: number | null;
          nonce?: number;
          partner_id?: number | null;
          signature?: string;
          token_id?: number | null;
          transaction?: string | null;
          updated?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "permits_beneficiary_id_fkey";
            columns: ["beneficiary_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "permits_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "location";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "permits_partner_id_fkey";
            columns: ["partner_id"];
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "permits_token_fkey";
            columns: ["token_id"];
            referencedRelation: "tokens";
            referencedColumns: ["id"];
          }
        ];
      };
      settlements: {
        Row: {
          created: string | null;
          credit_id: number | null;
          debit_id: number | null;
          id: number;
          location_id: number | null;
          updated: string | null;
          user_id: number;
        };
        Insert: {
          created?: string | null;
          credit_id?: number | null;
          debit_id?: number | null;
          id?: number;
          location_id?: number | null;
          updated?: string | null;
          user_id: number;
        };
        Update: {
          created?: string | null;
          credit_id?: number | null;
          debit_id?: number | null;
          id?: number;
          location_id?: number | null;
          updated?: string | null;
          user_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "settlements_credit_id_fkey";
            columns: ["credit_id"];
            referencedRelation: "credits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "settlements_debit_id_fkey";
            columns: ["debit_id"];
            referencedRelation: "debits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "settlements_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "location";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "settlements_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      tokens: {
        Row: {
          address: string;
          created: string | null;
          id: number;
          network: number;
          updated: string | null;
        };
        Insert: {
          address: string;
          created?: string | null;
          id?: number;
          network?: number;
          updated?: string | null;
        };
        Update: {
          address?: string;
          created?: string | null;
          id?: number;
          network?: number;
          updated?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          created: string | null;
          id: number;
          updated: string | null;
          wallet_id: number | null;
        };
        Insert: {
          created?: string | null;
          id: number;
          updated?: string | null;
          wallet_id?: number | null;
        };
        Update: {
          created?: string | null;
          id?: number;
          updated?: string | null;
          wallet_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_wallet_id_fkey";
            columns: ["wallet_id"];
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          }
        ];
      };
      wallets: {
        Row: {
          address: string | null;
          created: string | null;
          id: number;
          updated: string | null;
        };
        Insert: {
          address?: string | null;
          created?: string | null;
          id?: number;
          updated?: string | null;
        };
        Update: {
          address?: string | null;
          created?: string | null;
          id?: number;
          updated?: string | null;
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
          _username: string;
          _repository_name: string;
          _network_id: string;
          _token_address: string;
          _penalty_amount: string;
        };
        Returns: string;
      };
      remove_penalty: {
        Args: {
          _username: string;
          _repository_name: string;
          _network_id: string;
          _token_address: string;
          _penalty_amount: string;
        };
        Returns: string;
      };
    };
    Enums: {
      github_node_enum: "organization" | "repository" | "issue" | "comment";
      issue_status: "READY_TO_START" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
