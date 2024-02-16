import { Static, Type } from "@sinclair/typebox";
import { LogLevel } from "./log";
import { Context } from "probot";

const LabelItemSchema = Type.Object(
  {
    name: Type.String(),
  },
  {
    additionalProperties: false,
  }
);
export type LabelItem = Static<typeof LabelItemSchema>;

const CommentIncentivesSchema = Type.Object(
  {
    elements: Type.Record(Type.String(), Type.Number()),
    totals: Type.Object(
      {
        word: Type.Number(),
      },
      { additionalProperties: false }
    ),
  },
  { additionalProperties: false }
);
export type CommentIncentives = Static<typeof CommentIncentivesSchema>;

const IncentivesSchema = Type.Object(
  {
    comment: CommentIncentivesSchema,
  },
  { additionalProperties: false }
);

export type Incentives = Static<typeof IncentivesSchema>;

const CommandItemSchema = Type.Object(
  {
    name: Type.String(),
    enabled: Type.Boolean(),
  },
  { additionalProperties: false }
);
export type CommandItem = Static<typeof CommandItemSchema>;

export const PriceConfigSchema = Type.Object({
  baseMultiplier: Type.Number(),
  issueCreatorMultiplier: Type.Number(),
  timeLabels: Type.Array(LabelItemSchema),
  priorityLabels: Type.Array(LabelItemSchema),
  incentives: IncentivesSchema,
  defaultLabels: Type.Array(Type.String()),
});
export type PriceConfig = Static<typeof PriceConfigSchema>;

export const SupabaseConfigSchema = Type.Object({
  url: Type.String(),
  key: Type.String(),
});

export const TelegramBotConfigSchema = Type.Object({
  token: Type.String(),
  delay: Type.Number(),
});

export const LogNotificationSchema = Type.Object({
  url: Type.String(),
  secret: Type.String(),
  groupId: Type.Number(),
  topicId: Type.Number(),
  enabled: Type.Boolean(),
});

export type LogNotification = Static<typeof LogNotificationSchema>;

export const PayoutConfigSchema = Type.Object({
  networkId: Type.Number(),
  rpc: Type.String(),
  privateKey: Type.String(),
  paymentToken: Type.String(),
  permitBaseUrl: Type.String(),
});

export const UnassignConfigSchema = Type.Object({
  followUpTime: Type.Number(),
  disqualifyTime: Type.Number(),
  timeRangeForMaxIssue: Type.Number(),
  timeRangeForMaxIssueEnabled: Type.Boolean(),
});

export const ModeSchema = Type.Object({
  paymentPermitMaxPrice: Type.Number(),
  disableAnalytics: Type.Boolean(),
  incentiveMode: Type.Boolean(),
  assistivePricing: Type.Boolean(),
});

export const AssignSchema = Type.Object({
  bountyHunterMax: Type.Number(),
  staleBountyTime: Type.Number(),
});

export const LogConfigSchema = Type.Object({
  logEnvironment: Type.String(),
  level: Type.Enum(LogLevel),
  retryLimit: Type.Number(),
});

export const SodiumSchema = Type.Object({
  publicKey: Type.String(),
  privateKey: Type.String(),
});

export const CommentsSchema = Type.Object({
  promotionComment: Type.String(),
});

export const AskSchema = Type.Object({
  apiKey: Type.Optional(Type.String()),
  tokenLimit: Type.Number(),
});

export const NewContributorGreetingSchema = Type.Object({
  enabled: Type.Boolean(),
  header: Type.String(),
  helpMenu: Type.Boolean(),
  footer: Type.String(),
});
export type NewContributorGreeting = Static<typeof NewContributorGreetingSchema>;

export const CommandConfigSchema = Type.Array(CommandItemSchema);

export type CommandConfig = Static<typeof CommandConfigSchema>;
export const WalletSchema = Type.Object({
  registerWalletWithVerification: Type.Boolean(),
});

export const AccessControlSchema = Type.Object({
  label: Type.Boolean(),
  organization: Type.Boolean(),
});

export type AccessControl = Static<typeof AccessControlSchema>;

export const BotConfigSchema = Type.Object({
  log: LogConfigSchema,
  price: PriceConfigSchema,
  payout: PayoutConfigSchema,
  unassign: UnassignConfigSchema,
  supabase: SupabaseConfigSchema,
  telegram: TelegramBotConfigSchema,
  logNotification: LogNotificationSchema,
  mode: ModeSchema,
  assign: AssignSchema,
  sodium: SodiumSchema,
  comments: CommentsSchema,
  command: CommandConfigSchema,
  wallet: WalletSchema,
  ask: AskSchema,
  accessControl: AccessControlSchema,
  newContributorGreeting: NewContributorGreetingSchema,
});

export type BotConfig = Static<typeof BotConfigSchema>;

export interface BotContext extends Context {
  botConfig: BotConfig;
}

export const StreamlinedCommentSchema = Type.Object({
  login: Type.Optional(Type.String()),
  body: Type.Optional(Type.String()),
});

export type StreamlinedComment = Static<typeof StreamlinedCommentSchema>;

export const GPTResponseSchema = Type.Object({
  answer: Type.Optional(Type.String()),
  tokenUsage: Type.Object({
    output: Type.Optional(Type.Number()),
    input: Type.Optional(Type.Number()),
    total: Type.Optional(Type.Number()),
  }),
});

export type GPTResponse = Static<typeof GPTResponseSchema>;

export const WideConfigSchema = Type.Object(
  {
    evmNetworkId: Type.Optional(Type.Number()),
    priceMultiplier: Type.Optional(Type.Number()),
    issueCreatorMultiplier: Type.Optional(Type.Number()),
    timeLabels: Type.Optional(Type.Array(LabelItemSchema)),
    priorityLabels: Type.Optional(Type.Array(LabelItemSchema)),
    paymentPermitMaxPrice: Type.Optional(Type.Number()),
    commandSettings: Type.Optional(Type.Array(CommandItemSchema)),
    promotionComment: Type.Optional(Type.String()),
    disableAnalytics: Type.Optional(Type.Boolean()),
    commentIncentives: Type.Optional(Type.Boolean()),
    assistivePricing: Type.Optional(Type.Boolean()),
    maxConcurrentAssigns: Type.Optional(Type.Number()),
    incentives: Type.Optional(IncentivesSchema),
    defaultLabels: Type.Optional(Type.Array(Type.String())),
    registerWalletWithVerification: Type.Optional(Type.Boolean()),
    enableAccessControl: Type.Optional(AccessControlSchema),
    openAIKey: Type.Optional(Type.String()),
    openAITokenLimit: Type.Optional(Type.Number()),
    staleBountyTime: Type.Optional(Type.String()),
    privateKeyEncrypted: Type.Optional(Type.String()),
    newContributorGreeting: Type.Optional(NewContributorGreetingSchema),
  },
  {
    additionalProperties: false,
  }
);

export type WideConfig = Static<typeof WideConfigSchema>;

export type WideRepoConfig = WideConfig;

export const MergedConfigSchema = Type.Object({
  evmNetworkId: Type.Number(),
  priceMultiplier: Type.Number(),
  privateKeyEncrypted: Type.Optional(Type.String()),
  issueCreatorMultiplier: Type.Number(),
  timeLabels: Type.Array(LabelItemSchema),
  priorityLabels: Type.Array(LabelItemSchema),
  paymentPermitMaxPrice: Type.Number(),
  commandSettings: Type.Array(CommandItemSchema),
  promotionComment: Type.String(),
  disableAnalytics: Type.Boolean(),
  commentIncentives: Type.Boolean(),
  assistivePricing: Type.Boolean(),
  maxConcurrentAssigns: Type.Number(),
  incentives: IncentivesSchema,
  defaultLabels: Type.Array(Type.String()),
  registerWalletWithVerification: Type.Boolean(),
  enableAccessControl: AccessControlSchema,
  openAIKey: Type.Optional(Type.String()),
  openAITokenLimit: Type.Optional(Type.Number()),
  staleBountyTime: Type.String(),
  newContributorGreeting: NewContributorGreetingSchema,
  timeRangeForMaxIssue: Type.Number(),
  timeRangeForMaxIssueEnabled: Type.Boolean(),
  permitBaseUrl: Type.String(),
  botDelay: Type.Number(),
  followUpTime: Type.String(),
  disqualifyTime: Type.String(),
});

export type MergedConfig = Static<typeof MergedConfigSchema>;
