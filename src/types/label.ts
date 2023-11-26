import { Static, Type } from "@sinclair/typebox";

export const labelSchema = Type.Object({
  id: Type.Number(),
  node_id: Type.String(),
  url: Type.String(),
  name: Type.String(),
  color: Type.String(),
  default: Type.Boolean(),
  description: Type.Any(),
});

export type Label = Static<typeof labelSchema>;
