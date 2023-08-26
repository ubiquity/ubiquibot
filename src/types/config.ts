import { Static, Type } from "@sinclair/typebox";
import { Level } from "../adapters/supabase";

const LabelItemSchema = Type.Object({
  name: Type.String(),
  weight: Type.Number(),
  value: Type.Optional(Type.Number()),
});
export type LabelItem = Static<typeof LabelItemSchema>;

const CommentIncentivesSchema = Type.Object({
  elements: Type.Record(Type.String(), Type.Number()),
  totals: Type.Object({
    word: Type.Number(),
  }),
});
export type CommentIncentives = Static<typeof CommentIncentivesSchema>;

const IncentivesSchema = Type.Object({
  comment: CommentIncentivesSchema,
});
export type Incentives = Static<typeof IncentivesSchema>;

const CommandItemSchema = Type.Object({
  name: Type.String(),
  enabled: Type.Boolean(),
});
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
});

export const LogConfigSchema = Type.Object({
  logEnvironment: Type.String(),
  level: Type.Enum(Level),
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
});

export type BotConfig = Static<typeof BotConfigSchema>;
