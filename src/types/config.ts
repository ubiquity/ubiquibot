import { Static, Type } from "@sinclair/typebox";
import { LogLevel } from "./log";

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
  mode: ModeSchema,
  assign: AssignSchema,
  sodium: SodiumSchema,
  comments: CommentsSchema,
  command: CommandConfigSchema,
  wallet: WalletSchema,
  accessControl: AccessControlSchema,
});

export type BotConfig = Static<typeof BotConfigSchema>;

export const WideConfigSchema = Type.Object(
  {
    "evm-network-id": Type.Optional(Type.Number()),
    "price-multiplier": Type.Optional(Type.Number()),
    "issue-creator-multiplier": Type.Optional(Type.Number()),
    "time-labels": Type.Optional(Type.Array(LabelItemSchema)),
    "priority-labels": Type.Optional(Type.Array(LabelItemSchema)),
    "payment-permit-max-price": Type.Optional(Type.Number()),
    "command-settings": Type.Optional(Type.Array(CommandItemSchema)),
    "promotion-comment": Type.Optional(Type.String()),
    "disable-analytics": Type.Optional(Type.Boolean()),
    "comment-incentives": Type.Optional(Type.Boolean()),
    "assistive-pricing": Type.Optional(Type.Boolean()),
    "max-concurrent-assigns": Type.Optional(Type.Number()),
    incentives: Type.Optional(IncentivesSchema),
    "default-labels": Type.Optional(Type.Array(Type.String())),
    "register-wallet-with-verification": Type.Optional(Type.Boolean()),
    "enable-access-control": Type.Optional(AccessControlSchema),
    "stale-bounty-time": Type.Optional(Type.String()),
  },
  {
    additionalProperties: false,
  }
);

export type WideConfig = Static<typeof WideConfigSchema>;

export type WideRepoConfig = WideConfig;

export const WideOrgConfigSchema = Type.Composite([Type.Object({ "private-key-encrypted": Type.Optional(Type.String()) }), WideConfigSchema], {
  additionalProperties: false,
});

export type WideOrgConfig = Static<typeof WideOrgConfigSchema>;

export const MergedConfigSchema = Type.Object({
  "evm-network-id": Type.Number(),
  "price-multiplier": Type.Number(),
  "private-key-encrypted": Type.Optional(Type.String()),
  "issue-creator-multiplier": Type.Number(),
  "time-labels": Type.Array(LabelItemSchema),
  "priority-labels": Type.Array(LabelItemSchema),
  "payment-permit-max-price": Type.Number(),
  "command-settings": Type.Array(CommandItemSchema),
  "promotion-comment": Type.String(),
  "disable-analytics": Type.Boolean(),
  "comment-incentives": Type.Boolean(),
  "assistive-pricing": Type.Boolean(),
  "max-concurrent-assigns": Type.Number(),
  incentives: IncentivesSchema,
  "default-labels": Type.Array(Type.String()),
  "register-wallet-with-verification": Type.Boolean(),
  "enable-access-control": AccessControlSchema,
  "stale-bounty-time": Type.String(),
});

export type MergedConfig = Static<typeof MergedConfigSchema>;
