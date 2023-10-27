import { Static, Type } from "@sinclair/typebox";
import { LogLevel } from "../adapters/supabase/helpers/tables/logs";

const LabelFromConfigSchema = Type.Object(
  {
    name: Type.String(),
  },
  {
    additionalProperties: false,
  }
);
export type LabelFromConfig = Static<typeof LabelFromConfigSchema>;

const CommentIncentivesSchema = Type.Object(
  {
    elements: Type.Record(Type.String(), Type.Number()),
    totals: Type.Object(
      {
        word: Type.Number(),
      },
      { additionalProperties: false }
    ),
  },
  { additionalProperties: false }
);

const IncentivesSchema = Type.Object(
  {
    comment: CommentIncentivesSchema,
  },
  { additionalProperties: false }
);

export type Incentives = Static<typeof IncentivesSchema>;

const CommandItemSchema = Type.Object(
  {
    name: Type.String(),
    enabled: Type.Boolean(),
  },
  { additionalProperties: false }
);

const NewContributorGreetingSchema = Type.Object({
  enabled: Type.Boolean(),
  header: Type.String(),
  displayHelpMenu: Type.Boolean(),
  footer: Type.String(),
});

const PublicAccessControlSchema = Type.Object({
  setLabel: Type.Boolean(),
  fundExternalClosedIssue: Type.Boolean(),
});

export const BotConfigSchema = Type.Object({
  log: Type.Object({
    logEnvironment: Type.String(),
    level: Type.Enum(LogLevel),
    retryLimit: Type.Number(),
  }),
  price: Type.Object({
    priceMultiplier: Type.Number(),
    issueCreatorMultiplier: Type.Number(),
    timeLabels: Type.Array(LabelFromConfigSchema),
    priorityLabels: Type.Array(LabelFromConfigSchema),
    incentives: IncentivesSchema,
    defaultLabels: Type.Array(Type.String()),
  }),
  payout: Type.Object({
    evmNetworkId: Type.Number(),
    rpc: Type.String(),
    privateKey: Type.Union([Type.String(), Type.Null()]),
    publicKey: Type.Union([Type.String(), Type.Null()]),
    paymentToken: Type.String(),
    permitBaseUrl: Type.String(),
  }),
  unassign: Type.Object({
    taskFollowUpDuration: Type.String(),
    taskDisqualifyDuration: Type.String(),
    reviewDelayTolerance: Type.String(),
  }),
  supabase: Type.Object({
    url: Type.Union([Type.String(), Type.Null()]),
    key: Type.Union([Type.String(), Type.Null()]),
  }),
  mode: Type.Object({
    maxPermitPrice: Type.Number(),
    assistivePricing: Type.Boolean(),
  }),
  assign: Type.Object({
    maxConcurrentTasks: Type.Number(),
    taskStaleTimeoutDuration: Type.Number(),
  }),
  sodium: Type.Object({
    publicKey: Type.Union([Type.String(), Type.Null()]),
    privateKey: Type.Union([Type.String(), Type.Null()]),
  }),
  comments: Type.Object({
    promotionComment: Type.String(),
  }),
  command: Type.Array(CommandItemSchema),
  wallet: Type.Object({
    registerWalletWithVerification: Type.Boolean(),
  }),
  ask: Type.Object({
    apiKey: Type.Optional(Type.String()),
    tokenLimit: Type.Number(),
  }),
  publicAccessControl: Type.Object({
    setLabel: Type.Boolean(),
    fundExternalClosedIssue: Type.Boolean(),
  }),
  newContributorGreeting: Type.Object({
    enabled: Type.Boolean(),
    header: Type.String(),
    displayHelpMenu: Type.Boolean(),
    footer: Type.String(),
  }),
});

export type BotConfig = Static<typeof BotConfigSchema>;

const StreamlinedCommentSchema = Type.Object({
  login: Type.Optional(Type.String()),
  body: Type.Optional(Type.String()),
});

export type StreamlinedComment = Static<typeof StreamlinedCommentSchema>;

export const ConfigSchema = Type.Object(
  {
    evmNetworkId: Type.Optional(Type.Number()),
    priceMultiplier: Type.Optional(Type.Number()),
    issueCreatorMultiplier: Type.Optional(Type.Number()),
    timeLabels: Type.Optional(Type.Array(LabelFromConfigSchema)),
    priorityLabels: Type.Optional(Type.Array(LabelFromConfigSchema)),
    maxPermitPrice: Type.Optional(Type.Number()),
    commandSettings: Type.Optional(Type.Array(CommandItemSchema)),
    promotionComment: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    assistivePricing: Type.Optional(Type.Boolean()),
    maxConcurrentTasks: Type.Optional(Type.Number()),
    incentives: Type.Optional(IncentivesSchema),
    defaultLabels: Type.Optional(Type.Array(Type.String())),
    registerWalletWithVerification: Type.Optional(Type.Boolean()),
    publicAccessControl: Type.Optional(PublicAccessControlSchema),
    openAIKey: Type.Optional(Type.String()),
    openAITokenLimit: Type.Optional(Type.Number()),
    taskStaleTimeoutDuration: Type.Optional(Type.String()),
    privateKeyEncrypted: Type.Optional(Type.String()),
    newContributorGreeting: Type.Optional(NewContributorGreetingSchema),
  },
  {
    additionalProperties: false,
  }
);

export type Config = Static<typeof ConfigSchema>;

// export type Config = Config;

// const MergedConfigSchema = Type.Object({
//   assistivePricing: Type.Boolean(),
//   commandSettings: Type.Array(CommandItemSchema),
//   defaultLabels: Type.Array(Type.String()),
//   evmNetworkId: Type.Number(),
//   incentives: IncentivesSchema,
//   issueCreatorMultiplier: Type.Number(),
//   maxConcurrentTasks: Type.Number(),
//   newContributorGreeting: NewContributorGreetingSchema,
//   openAIKey: Type.Optional(Type.String()),
//   openAITokenLimit: Type.Optional(Type.Number()),
//   maxPermitPrice: Type.Number(),
//   priceMultiplier: Type.Number(),
//   priorityLabels: Type.Array(LabelFromConfigSchema),
//   privateKeyEncrypted: Type.Optional(Type.String()),
//   promotionComment: Type.String(),
//   publicAccessControl: PublicAccessControlSchema,
//   registerWalletWithVerification: Type.Boolean(),
//   taskStaleTimeoutDuration: Type.String(),
//   timeLabels: Type.Array(LabelFromConfigSchema),
//   reviewDelayTolerance: Type.String(),
//   permitBaseUrl: Type.String(),
//   taskFollowUpDuration: Type.String(),
//   taskDisqualifyDuration: Type.String(),
// });

// export type MergedConfig = Static<typeof MergedConfigSchema>;
