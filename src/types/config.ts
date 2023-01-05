import { Static, Type } from "@sinclair/typebox";

const LabelItemSchema = Type.Object({
  name: Type.String(),
  weight: Type.Number(),
  target: Type.String(),
});

export const PriceConfigSchema = Type.Object({
  baseMultiplier: Type.Number(),
  timeLabels: Type.Array(LabelItemSchema),
  priorityLabels: Type.Array(LabelItemSchema),
});
export type PriceConfig = Static<typeof PriceConfigSchema>;

export const BotConfigSchema = Type.Object({
  price: PriceConfigSchema,
});

export type BotConfig = Static<typeof BotConfigSchema>;
