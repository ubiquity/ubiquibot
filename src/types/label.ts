import { Static, Type } from "@sinclair/typebox";
import { TURL } from "./shared";

export const LabelSchema = Type.Object({
  id: Type.Number(),
  node_id: Type.String(),
  url: TURL,
  name: Type.String(),
  color: Type.String(),
  default: Type.Boolean(),
  description: Type.String(),
});

export type Label = Static<typeof LabelSchema>;
