type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      access: {
        Row: {
          created: string;
          id: number;
          labels: Json | null;
          location_id: number | null;
          multiplier: number;
          multiplier_reason: string | null;
          updated: string | null;
          user_id: number;
        };
        Insert: {
          created?: string;
          id?: number;
          labels?: Json | null;
          location_id?: number | null;
          multiplier?: number;
          multiplier_reason?: string | null;
          updated?: string | null;
          user_id: number;
        };
        Update: {
          created?: string;
          id?: number;
          labels?: Json | null;
          location_id?: number | null;
          multiplier?: number;
          multiplier_reason?: string | null;
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
            referencedRelation: "locations";
            referencedColumns: ["id"];
          }
        ];
      };
      credits: {
        Row: {
          amount: number;
          created: string;
          id: number;
          location_id: number | null;
          permit_id: number | null;
          updated: string | null;
        };
        Insert: {
          amount: number;
          created?: string;
          id?: number;
          location_id?: number | null;
          permit_id?: number | null;
          updated?: string | null;
        };
        Update: {
          amount?: number;
          created?: string;
          id?: number;
          location_id?: number | null;
          permit_id?: number | null;
          updated?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "credits_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "locations";
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
          created: string;
          id: number;
          location_id: number | null;
          token_id: number | null;
          updated: string | null;
        };
        Insert: {
          amount: number;
          created?: string;
          id?: number;
          location_id?: number | null;
          token_id?: number | null;
          updated?: string | null;
        };
        Update: {
          amount?: number;
          created?: string;
          id?: number;
          location_id?: number | null;
          token_id?: number | null;
          updated?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "debits_token_id_fkey";
            columns: ["token_id"];
            referencedRelation: "tokens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_debits_location";
            columns: ["location_id"];
            referencedRelation: "locations";
            referencedColumns: ["id"];
          }
        ];
      };
      labels: {
        Row: {
          authorized: boolean | null;
          created: string;
          id: number;
          label_from: string | null;
          label_to: string | null;
          location_id: number | null;
          updated: string | null;
        };
        Insert: {
          authorized?: boolean | null;
          created?: string;
          id?: number;
          label_from?: string | null;
          label_to?: string | null;
          location_id?: number | null;
          updated?: string | null;
        };
        Update: {
          authorized?: boolean | null;
          created?: string;
          id?: number;
          label_from?: string | null;
          label_to?: string | null;
          location_id?: number | null;
          updated?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "labels_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "locations";
            referencedColumns: ["id"];
          }
        ];
      };
      locations: {
        Row: {
          comment_id: number | null;
          created: string;
          id: number;
          issue_id: number | null;
          node_id: string | null;
          node_type: string | null;
          node_url: string | null;
          organization_id: number | null;
          repository_id: number | null;
          updated: string | null;
          user_id: number | null;
        };
        Insert: {
          comment_id?: number | null;
          created?: string;
          id?: number;
          issue_id?: number | null;
          node_id?: string | null;
          node_type?: string | null;
          node_url?: string | null;
          organization_id?: number | null;
          repository_id?: number | null;
          updated?: string | null;
          user_id?: number | null;
        };
        Update: {
          comment_id?: number | null;
          created?: string;
          id?: number;
          issue_id?: number | null;
          node_id?: string | null;
          node_type?: string | null;
          node_url?: string | null;
          organization_id?: number | null;
          repository_id?: number | null;
          updated?: string | null;
          user_id?: number | null;
        };
        Relationships: [];
      };
      logs: {
        Row: {
          created: string;
          id: number;
          level: string | null;
          location_id: number | null;
          log: string;
          metadata: Json | null;
          updated: string | null;
        };
        Insert: {
          created?: string;
          id?: number;
          level?: string | null;
          location_id?: number | null;
          log: string;
          metadata?: Json | null;
          updated?: string | null;
        };
        Update: {
          created?: string;
          id?: number;
          level?: string | null;
          location_id?: number | null;
          log?: string;
          metadata?: Json | null;
          updated?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_logs_location";
            columns: ["location_id"];
            referencedRelation: "locations";
            referencedColumns: ["id"];
          }
        ];
      };
      partners: {
        Row: {
          created: string;
          id: number;
          location_id: number | null;
          updated: string | null;
          wallet_id: number | null;
        };
        Insert: {
          created?: string;
          id?: number;
          location_id?: number | null;
          updated?: string | null;
          wallet_id?: number | null;
        };
        Update: {
          created?: string;
          id?: number;
          location_id?: number | null;
          updated?: string | null;
          wallet_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_partners_location";
            columns: ["location_id"];
            referencedRelation: "locations";
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
          amount: string;
          beneficiary_id: number;
          created: string;
          deadline: string;
          id: number;
          location_id: number | null;
          nonce: string;
          partner_id: number | null;
          signature: string;
          token_id: number | null;
          transaction: string | null;
          updated: string | null;
        };
        Insert: {
          amount: string;
          beneficiary_id: number;
          created?: string;
          deadline: string;
          id?: number;
          location_id?: number | null;
          nonce: string;
          partner_id?: number | null;
          signature: string;
          token_id?: number | null;
          transaction?: string | null;
          updated?: string | null;
        };
        Update: {
          amount?: string;
          beneficiary_id?: number;
          created?: string;
          deadline?: string;
          id?: number;
          location_id?: number | null;
          nonce?: string;
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
            referencedRelation: "locations";
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
          created: string;
          credit_id: number | null;
          debit_id: number | null;
          id: number;
          location_id: number | null;
          updated: string | null;
          user_id: number;
        };
        Insert: {
          created?: string;
          credit_id?: number | null;
          debit_id?: number | null;
          id?: number;
          location_id?: number | null;
          updated?: string | null;
          user_id: number;
        };
        Update: {
          created?: string;
          credit_id?: number | null;
          debit_id?: number | null;
          id?: number;
          location_id?: number | null;
          updated?: string | null;
          user_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "fk_settlements_location";
            columns: ["location_id"];
            referencedRelation: "locations";
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
          created: string;
          id: number;
          location_id: number | null;
          network: number;
          updated: string | null;
        };
        Insert: {
          address: string;
          created?: string;
          id?: number;
          location_id?: number | null;
          network?: number;
          updated?: string | null;
        };
        Update: {
          address?: string;
          created?: string;
          id?: number;
          location_id?: number | null;
          network?: number;
          updated?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tokens_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "locations";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          created: string;
          id: number;
          location_id: number | null;
          updated: string | null;
          wallet_id: number | null;
        };
        Insert: {
          created?: string;
          id?: number;
          location_id?: number | null;
          updated?: string | null;
          wallet_id?: number | null;
        };
        Update: {
          created?: string;
          id?: number;
          location_id?: number | null;
          updated?: string | null;
          wallet_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "locations";
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
          created: string;
          id: number;
          location_id: number | null;
          updated: string | null;
        };
        Insert: {
          address?: string | null;
          created?: string;
          id?: number;
          location_id?: number | null;
          updated?: string | null;
        };
        Update: {
          address?: string | null;
          created?: string;
          id?: number;
          location_id?: number | null;
          updated?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wallets_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "locations";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      github_node_type:
        | "App"
        | "Bot"
        | "CheckRun"
        | "CheckSuite"
        | "ClosedEvent"
        | "CodeOfConduct"
        | "Commit"
        | "CommitComment"
        | "CommitContributionsByRepository"
        | "ContributingGuidelines"
        | "ConvertToDraftEvent"
        | "CreatedCommitContribution"
        | "CreatedIssueContribution"
        | "CreatedPullRequestContribution"
        | "CreatedPullRequestReviewContribution"
        | "CreatedRepositoryContribution"
        | "CrossReferencedEvent"
        | "Discussion"
        | "DiscussionComment"
        | "Enterprise"
        | "EnterpriseUserAccount"
        | "FundingLink"
        | "Gist"
        | "Issue"
        | "IssueComment"
        | "JoinedGitHubContribution"
        | "Label"
        | "License"
        | "Mannequin"
        | "MarketplaceCategory"
        | "MarketplaceListing"
        | "MergeQueue"
        | "MergedEvent"
        | "MigrationSource"
        | "Milestone"
        | "Organization"
        | "PackageFile"
        | "Project"
        | "ProjectCard"
        | "ProjectColumn"
        | "ProjectV2"
        | "PullRequest"
        | "PullRequestCommit"
        | "PullRequestReview"
        | "PullRequestReviewComment"
        | "ReadyForReviewEvent"
        | "Release"
        | "ReleaseAsset"
        | "Repository"
        | "RepositoryContactLink"
        | "RepositoryTopic"
        | "RestrictedContribution"
        | "ReviewDismissedEvent"
        | "SecurityAdvisoryReference"
        | "SocialAccount"
        | "SponsorsListing"
        | "Team"
        | "TeamDiscussion"
        | "TeamDiscussionComment"
        | "User"
        | "Workflow"
        | "WorkflowRun"
        | "WorkflowRunFile";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
