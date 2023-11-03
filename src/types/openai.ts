import { Type as T, Static } from "@sinclair/typebox";

export const StreamlinedCommentSchema = T.Object({
  login: T.Optional(T.String()),
  body: T.Optional(T.String()),
});

export type StreamlinedComment = Static<typeof StreamlinedCommentSchema>;

export const GPTResponseSchema = T.Object({
  answer: T.Optional(T.String()),
  tokenUsage: T.Object({
    output: T.Optional(T.Number()),
    input: T.Optional(T.Number()),
    total: T.Optional(T.Number()),
  }),
});

export type GPTResponse = Static<typeof GPTResponseSchema>;
