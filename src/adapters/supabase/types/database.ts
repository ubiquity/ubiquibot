export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      access: {
        Row: {
          created: string | null;
          id: number;
          labels: Json | null;
          location_id: number | null;
          multiplier: number;
          node_id: string | null;
          node_type: string | null;
          updated: string | null;
          user_id: number;
        };
        Insert: {
          created?: string | null;
          id?: number;
          labels?: Json | null;
          location_id?: number | null;
          multiplier?: number;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
          user_id: number;
        };
        Update: {
          created?: string | null;
          id?: number;
          labels?: Json | null;
          location_id?: number | null;
          multiplier?: number;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
          user_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "access_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_access_location";
            columns: ["location_id"];
            referencedRelation: "location";
            referencedColumns: ["id"];
          }
        ];
      };
      credits: {
        Row: {
          amount: number;
          created: string | null;
          id: number;
          location_id: number | null;
          node_id: string | null;
          node_type: string | null;
          permit_id: number | null;
          updated: string | null;
        };
        Insert: {
          amount: number;
          created?: string | null;
          id?: number;
          location_id?: number | null;
          node_id?: string | null;
          node_type?: string | null;
          permit_id?: number | null;
          updated?: string | null;
        };
        Update: {
          amount?: number;
          created?: string | null;
          id?: number;
          location_id?: number | null;
          node_id?: string | null;
          node_type?: string | null;
          permit_id?: number | null;
          updated?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "credits_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "location";
            referencedColumns: ["id"];
          },
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
          node_id: string | null;
          node_type: string | null;
          updated: string | null;
        };
        Insert: {
          amount: number;
          created?: string | null;
          id?: number;
          location_id?: number | null;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
        };
        Update: {
          amount?: number;
          created?: string | null;
          id?: number;
          location_id?: number | null;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_debits_location";
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
          node_id: string | null;
          node_type: string | null;
          updated: string | null;
        };
        Insert: {
          created?: string | null;
          id?: number;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
        };
        Update: {
          created?: string | null;
          id?: number;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
        };
        Relationships: [];
      };
      logs: {
        Row: {
          created: string | null;
          id: number;
          location_id: number | null;
          log_entry: string;
          node_id: string | null;
          node_type: string | null;
          updated: string | null;
        };
        Insert: {
          created?: string | null;
          id?: number;
          location_id?: number | null;
          log_entry: string;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
        };
        Update: {
          created?: string | null;
          id?: number;
          location_id?: number | null;
          log_entry?: string;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_logs_location";
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
          location_id: number | null;
          node_id: string | null;
          node_type: string | null;
          updated: string | null;
          wallet_id: number | null;
        };
        Insert: {
          created?: string | null;
          id?: number;
          location_id?: number | null;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
          wallet_id?: number | null;
        };
        Update: {
          created?: string | null;
          id?: number;
          location_id?: number | null;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
          wallet_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_partners_location";
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
          node_id: string | null;
          node_type: string | null;
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
          node_id?: string | null;
          node_type?: string | null;
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
          node_id?: string | null;
          node_type?: string | null;
          nonce?: number;
          partner_id?: number | null;
          signature?: string;
          token_id?: number | null;
          transaction?: string | null;
          updated?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_permits_location";
            columns: ["location_id"];
            referencedRelation: "location";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "permits_beneficiary_id_fkey";
            columns: ["beneficiary_id"];
            referencedRelation: "users";
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
          node_id: string | null;
          node_type: string | null;
          updated: string | null;
          user_id: number;
        };
        Insert: {
          created?: string | null;
          credit_id?: number | null;
          debit_id?: number | null;
          id?: number;
          location_id?: number | null;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
          user_id: number;
        };
        Update: {
          created?: string | null;
          credit_id?: number | null;
          debit_id?: number | null;
          id?: number;
          location_id?: number | null;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
          user_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "fk_settlements_location";
            columns: ["location_id"];
            referencedRelation: "location";
            referencedColumns: ["id"];
          },
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
          location_id: number | null;
          network: number;
          node_id: string | null;
          node_type: string | null;
          updated: string | null;
        };
        Insert: {
          address: string;
          created?: string | null;
          id?: number;
          location_id?: number | null;
          network?: number;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
        };
        Update: {
          address?: string;
          created?: string | null;
          id?: number;
          location_id?: number | null;
          network?: number;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tokens_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "location";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          created: string | null;
          id: number;
          location_id: number | null;
          node_id: string | null;
          node_type: string | null;
          updated: string | null;
          wallet_id: number | null;
        };
        Insert: {
          created?: string | null;
          id?: number;
          location_id?: number | null;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
          wallet_id?: number | null;
        };
        Update: {
          created?: string | null;
          id?: number;
          location_id?: number | null;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
          wallet_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "location";
            referencedColumns: ["id"];
          },
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
          location_id: number | null;
          node_id: string | null;
          node_type: string | null;
          updated: string | null;
        };
        Insert: {
          address?: string | null;
          created?: string | null;
          id?: number;
          location_id?: number | null;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
        };
        Update: {
          address?: string | null;
          created?: string | null;
          id?: number;
          location_id?: number | null;
          node_id?: string | null;
          node_type?: string | null;
          updated?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wallets_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "location";
            referencedColumns: ["id"];
          }
        ];
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
