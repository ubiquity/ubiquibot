import { Static, Type } from "@sinclair/typebox";

const LabelItemSchema = Type.Object({
  name: Type.String(),
  weight: Type.Number(),
  value: Type.Optional(Type.Number()),
});
export type LabelItem = Static<typeof LabelItemSchema>;

const CommentElementPricingSchema = Type.Record(Type.String(), Type.Number());
export type CommentElementPricing = Static<typeof CommentElementPricingSchema>;

export const DefaultLabelsSchema = Type.Object({
  global: Type.Array(Type.String()),
  users: Type.Record(Type.String(), Type.Array(Type.String())),
});

export const PriceConfigSchema = Type.Object({
  baseMultiplier: Type.Number(),
  issueCreatorMultiplier: Type.Number(),
  timeLabels: Type.Array(LabelItemSchema),
  priorityLabels: Type.Array(LabelItemSchema),
  commentElementPricing: CommentElementPricingSchema,
  defaultLabels: DefaultLabelsSchema,
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
  chainId: Type.Number(),
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
  autoPayMode: Type.Boolean(),
  analyticsMode: Type.Boolean(),
  incentiveMode: Type.Boolean(),
});

export const AssignSchema = Type.Object({
  bountyHunterMax: Type.Number(),
});

export const LogConfigSchema = Type.Object({
  level: Type.String(),
  ingestionKey: Type.String(),
});

export const SodiumSchema = Type.Object({
  publicKey: Type.String(),
  privateKey: Type.String(),
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
});

export type BotConfig = Static<typeof BotConfigSchema>;
