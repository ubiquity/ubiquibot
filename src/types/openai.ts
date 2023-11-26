import { Type as T, Static } from "@sinclair/typebox";

const streamlinedCommentSchema = T.Object({
  login: T.Optional(T.String()),
  body: T.Optional(T.String()),
});

export type StreamlinedComment = Static<typeof streamlinedCommentSchema>;
