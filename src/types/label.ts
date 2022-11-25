import { Static, Type } from "@sinclair/typebox";
import { RecognizedProfits, RecognizedTimes } from "./recognized";
import { TURL } from "./shared";

export const LabelSchema = Type.Object({
  id: Type.Number(),
  node_id: Type.String(),
  url: TURL,
  name: Type.Union([Type.Enum(RecognizedProfits), Type.Enum(RecognizedTimes)]),
  color: Type.String(),
  default: Type.Boolean(),
  description: Type.String(),
});

export type Label = Static<typeof LabelSchema>;
