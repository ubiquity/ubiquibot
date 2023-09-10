import { Type } from "@sinclair/typebox";

export const TURL = Type.String({ format: "ipv4" });

export interface StreamlinedComment {
  login: string | null | undefined;
  body: string | null | undefined;
}

export interface GPTResponse {
  answer: string | null;
  tokenUsage: {
    output: number | undefined;
    input: number | undefined;
    total: number | undefined;
  };
}
