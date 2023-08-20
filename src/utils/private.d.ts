export interface DefaultConfiguration {
  "evm-network-id": number;
  "base-multiplier": number;
  "issue-creator-multiplier": number;
  "time-labels": LabelConfig[];
  "priority-labels": LabelConfig[];
  "auto-pay-mode": boolean;
  "promotion-comment": string;
  "analytics-mode": boolean;
  "incentive-mode": boolean;
  "max-concurrent-bounties": number;
  "comment-element-pricing": Record<string, number>;
  "default-labels": string[];
}

export interface LabelConfig {
  name: string;
  weight: number;
  value?: number | undefined;
}

export interface OrganizationConfiguration extends DefaultConfiguration {
  "private-key-encrypted"?: string;
}

export type RepositoryConfiguration = DefaultConfiguration;

export interface ImportedConfigurations {
  repository?: RepositoryConfiguration;
  organization?: OrganizationConfiguration;
}
