import { Static, Type } from "@sinclair/typebox";
import { LogLevel } from "../adapters/supabase/helpers/tables/logs";

const LabelFromConfigSchema = Type.Object(
  {
    name: Type.String(),
  },
  {
    additionalProperties: false,
  }
);
export type LabelFromConfig = Static<typeof LabelFromConfigSchema>;

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

const PriceConfigSchema = Type.Object({
  priceMultiplier: Type.Number(),
  issueCreatorMultiplier: Type.Number(),
  timeLabels: Type.Array(LabelFromConfigSchema),
  priorityLabels: Type.Array(LabelFromConfigSchema),
  incentives: IncentivesSchema,
  defaultLabels: Type.Array(Type.String()),
});
export type PriceConfig = Static<typeof PriceConfigSchema>;

const SupabaseConfigSchema = Type.Object({
  url: Type.Union([Type.String(), Type.Null()]),
  key: Type.Union([Type.String(), Type.Null()]),
});

const LogNotificationSchema = Type.Object({
  url: Type.String(),
  secret: Type.String(),
  groupId: Type.Number(),
  topicId: Type.Number(),
  enabled: Type.Boolean(),
});

export type LogNotification = Static<typeof LogNotificationSchema>;

export const PayoutConfigSchema = Type.Object({
  evmNetworkId: Type.Number(),
  rpc: Type.String(),
  privateKey: Type.Union([Type.String(), Type.Null()]),
  paymentToken: Type.String(),
  permitBaseUrl: Type.String(),
});

const UnassignConfigSchema = Type.Object({
  followUpTime: Type.Number(),
  disqualifyTime: Type.Number(),
  timeRangeForMaxIssue: Type.Number(),
});

const ModeSchema = Type.Object({
  permitMaxPrice: Type.Number(),
  disableAnalytics: Type.Boolean(),
  incentiveMode: Type.Boolean(),
  assistivePricing: Type.Boolean(),
});

const AssignSchema = Type.Object({
  maxConcurrentTasks: Type.Number(),
  staleTaskTime: Type.Number(),
});

const LogConfigSchema = Type.Object({
  logEnvironment: Type.String(),
  level: Type.Enum(LogLevel),
  retryLimit: Type.Number(),
});

const SodiumSchema = Type.Object({
  publicKey: Type.Union([Type.String(), Type.Null()]),
  privateKey: Type.Union([Type.String(), Type.Null()]),
});

const CommentsSchema = Type.Object({
  promotionComment: Type.String(),
});

const AskSchema = Type.Object({
  apiKey: Type.Optional(Type.String()),
  tokenLimit: Type.Number(),
});

const NewContributorGreetingSchema = Type.Object({
  enabled: Type.Boolean(),
  header: Type.String(),
  helpMenu: Type.Boolean(),
  footer: Type.String(),
});
export type NewContributorGreeting = Static<typeof NewContributorGreetingSchema>;

const CommandConfigSchema = Type.Array(CommandItemSchema);

export type CommandConfig = Static<typeof CommandConfigSchema>;
const WalletSchema = Type.Object({
  registerWalletWithVerification: Type.Boolean(),
});

const PublicAccessControlSchema = Type.Object({
  setLabel: Type.Boolean(),
  fundExternalClosedIssue: Type.Boolean(),
});

export type AccessControl = Static<typeof PublicAccessControlSchema>;

export const BotConfigSchema = Type.Object({
  log: LogConfigSchema,
  price: PriceConfigSchema,
  payout: PayoutConfigSchema,
  unassign: UnassignConfigSchema,
  supabase: SupabaseConfigSchema,
  // logNotification: LogNotificationSchema,
  mode: ModeSchema,
  assign: AssignSchema,
  sodium: SodiumSchema,
  comments: CommentsSchema,
  command: CommandConfigSchema,
  wallet: WalletSchema,
  ask: AskSchema,
  publicAccessControl: PublicAccessControlSchema,
  newContributorGreeting: NewContributorGreetingSchema,
});

export type BotConfig = Static<typeof BotConfigSchema>;

const StreamlinedCommentSchema = Type.Object({
  login: Type.Optional(Type.String()),
  body: Type.Optional(Type.String()),
});

export type StreamlinedComment = Static<typeof StreamlinedCommentSchema>;

const GPTResponseSchema = Type.Object({
  answer: Type.Optional(Type.String()),
  tokenUsage: Type.Object({
    output: Type.Optional(Type.Number()),
    input: Type.Optional(Type.Number()),
    total: Type.Optional(Type.Number()),
  }),
});

export type GPTResponse = Static<typeof GPTResponseSchema>;

export const ConfigSchema = Type.Object(
  {
    evmNetworkId: Type.Optional(Type.Number()),
    priceMultiplier: Type.Optional(Type.Number()),
    issueCreatorMultiplier: Type.Optional(Type.Number()),
    timeLabels: Type.Optional(Type.Array(LabelFromConfigSchema)),
    priorityLabels: Type.Optional(Type.Array(LabelFromConfigSchema)),
    permitMaxPrice: Type.Optional(Type.Number()),
    commandSettings: Type.Optional(Type.Array(CommandItemSchema)),
    promotionComment: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    disableAnalytics: Type.Optional(Type.Boolean()),
    incentiveMode: Type.Optional(Type.Boolean()),
    assistivePricing: Type.Optional(Type.Boolean()),
    maxConcurrentTasks: Type.Optional(Type.Number()),
    incentives: Type.Optional(IncentivesSchema),
    defaultLabels: Type.Optional(Type.Array(Type.String())),
    registerWalletWithVerification: Type.Optional(Type.Boolean()),
    publicAccessControl: Type.Optional(PublicAccessControlSchema),
    openAIKey: Type.Optional(Type.String()),
    openAITokenLimit: Type.Optional(Type.Number()),
    staleTaskTime: Type.Optional(Type.String()),
    privateKeyEncrypted: Type.Optional(Type.String()),
    newContributorGreeting: Type.Optional(NewContributorGreetingSchema),
  },
  {
    additionalProperties: false,
  }
);

export type Config = Static<typeof ConfigSchema>;

// export type Config = Config;

const MergedConfigSchema = Type.Object({
  assistivePricing: Type.Boolean(),
  commandSettings: Type.Array(CommandItemSchema),
  incentiveMode: Type.Boolean(),
  defaultLabels: Type.Array(Type.String()),
  disableAnalytics: Type.Boolean(),
  evmNetworkId: Type.Number(),
  incentives: IncentivesSchema,
  issueCreatorMultiplier: Type.Number(),
  maxConcurrentTasks: Type.Number(),
  newContributorGreeting: NewContributorGreetingSchema,
  openAIKey: Type.Optional(Type.String()),
  openAITokenLimit: Type.Optional(Type.Number()),
  permitMaxPrice: Type.Number(),
  priceMultiplier: Type.Number(),
  priorityLabels: Type.Array(LabelFromConfigSchema),
  privateKeyEncrypted: Type.Optional(Type.String()),
  promotionComment: Type.String(),
  publicAccessControl: PublicAccessControlSchema,
  registerWalletWithVerification: Type.Boolean(),
  staleTaskTime: Type.String(),
  timeLabels: Type.Array(LabelFromConfigSchema),
  staleBountyTime: Type.String(),
  timeRangeForMaxIssue: Type.Number(),
  permitBaseUrl: Type.String(),
  followUpTime: Type.String(),
  disqualifyTime: Type.String(),
});

export type MergedConfig = Static<typeof MergedConfigSchema>;
