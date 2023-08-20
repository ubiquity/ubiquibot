import { Static, Type } from "@sinclair/typebox";

const LabelItemSchema = Type.Object({
  name: Type.String(),
  weight: Type.Number(),
  value: Type.Optional(Type.Number()),
});
export type LabelItem = Static<typeof LabelItemSchema>;

const CommandItemSchema = Type.Object({
  name: Type.String(),
  enabled: Type.Boolean(),
});
export type CommandItem = Static<typeof CommandItemSchema>;

const CommentElementPricingSchema = Type.Record(Type.String(), Type.Number());

import DEFAULT_JSON_CONFIG from "../../ubiquibot-config-default.json";

export type CommentElementPricing = {
  [key in keyof (typeof DEFAULT_JSON_CONFIG)["comment-element-pricing"]]: number;
};

export const PriceConfigSchema = Type.Object({
  baseMultiplier: Type.Number(),
  issueCreatorMultiplier: Type.Number(),
  timeLabels: Type.Array(LabelItemSchema),
  priorityLabels: Type.Array(LabelItemSchema),
  commentElementPricing: CommentElementPricingSchema,
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
  evmNetworkId: Type.Number(),
  rpc: Type.String(),
  privateKey: Type.String(),
  paymentToken: Type.String(),
  permitBaseUrl: Type.String(),
});

export const UnassignConfigSchema = Type.Object({
  followUpTime: Type.Number(),
  disqualifyTime: Type.Number(),
});

export const ModeSchema = Type.Object({
  paymentPermitMaxPrice: Type.Number(),
  disableAnalytics: Type.Boolean(),
  incentiveMode: Type.Boolean(),
  assistivePricing: Type.Boolean(),
});

export const AssignSchema = Type.Object({
  maxConcurrentAssigns: Type.Number(),
});

export const LogConfigSchema = Type.Object({
  level: Type.String(),
  ingestionKey: Type.String(),
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
