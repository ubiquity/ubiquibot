import { Static, Type } from "@sinclair/typebox";

const LabelItemSchema = Type.Object({
  name: Type.String(),
  weight: Type.Number(),
  value: Type.Optional(Type.Number()),
  target: Type.String(),
});
export type LabelItem = Static<typeof LabelItemSchema>;

export const PriceConfigSchema = Type.Object({
  baseMultiplier: Type.Number(),
  timeLabels: Type.Array(LabelItemSchema),
  profitLabels: Type.Array(LabelItemSchema),
});
export type PriceConfig = Static<typeof PriceConfigSchema>;

export const BotConfigSchema = Type.Object({
  price: PriceConfigSchema,
});

export type BotConfig = Static<typeof BotConfigSchema>;
