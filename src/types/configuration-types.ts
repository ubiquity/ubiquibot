import { Type as T, Static } from "@sinclair/typebox";
import { LogLevel } from "../adapters/supabase/helpers/tables/logs";
import { validHTMLElements } from "../handlers/comment/handlers/issue/valid-html-elements";
import z from "zod";

const promotionComment =
  "###### If you enjoy the DevPool experience, please follow [Ubiquity on GitHub](https://github.com/ubiquity) and star [this repo](https://github.com/ubiquity/devpool-directory) to show your support. It helps a lot!";
const defaultGreetingHeader =
  "Thank you for contributing! Please be sure to set your wallet address before completing your first task so that you can collect your reward.";

const HtmlEntities = validHTMLElements.map((value) => T.Literal(value));

const allHtmlElementsSetToZero = validHTMLElements.reduce<Record<keyof HTMLElementTagNameMap, number>>(
  (accumulator, current) => {
    accumulator[current] = 0;
    return accumulator;
  },
  {} as Record<keyof HTMLElementTagNameMap, number>
);

const defaultTimeLabels = [
  { name: "Time: <1 Hour" },
  { name: "Time: <2 Hours" },
  { name: "Time: <4 Hours" },
  { name: "Time: <1 Day" },
  { name: "Time: <1 Week" },
];

const defaultPriorityLabels = [
  { name: "Priority: 1 (Normal)" },
  { name: "Priority: 2 (Medium)" },
  { name: "Priority: 3 (High)" },
  { name: "Priority: 4 (Urgent)" },
  { name: "Priority: 5 (Emergency)" },
];

/*
export const EnvConfigSchema = z.object({
  WEBHOOK_PROXY_URL: z.string().url(),
  LOG_ENVIRONMENT: z.string().default("development"),
  LOG_LEVEL: z.nativeEnum(LogLevel).default(LogLevel.SILLY),
  LOG_RETRY_LIMIT: z.number().default(8),
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string(),
  X25519_PRIVATE_KEY: z.string(),
  PRIVATE_KEY: z.string(),
  APP_ID: z.number(),
});

export type EnvConfig = z.infer<typeof EnvConfigSchema>;

export const BotConfigSchema = z.strictObject({
  keys: z.strictObject({
    evmPrivateEncrypted: z.string().optional(),
    openAi: z.string().optional(),
  }),
  features: z.strictObject({
    assistivePricing: z.boolean().default(false),
    defaultLabels: z.string().array().default([]),
    newContributorGreeting: z
      .strictObject({
        header: z.string().default(
          "Thank you for contributing! \
        Please be sure to set your wallet address \
        before completing your first task so that you can \
        collect your reward."
        ),
        displayHelpMenu: z.boolean().default(true),
        footer: z.string().default(promotionComment),
      })
      .default({}),
    publicAccessControl: z
      .strictObject({
        setLabel: z.boolean().default(true),
        fundExternalClosedIssue: z.boolean().default(true),
      })
      .default({}),
  }),
  timers: z
    .strictObject({
      reviewDelayTolerance: z.string().default("1 day"),
      taskStaleTimeoutDuration: z.string().default("1 month"),
      taskFollowUpDuration: z.string().default("0.5 weeks"),
      taskDisqualifyDuration: z.string().default("1 week"),
    })
    .default({}),
  payments: z
    .strictObject({
      maxPermitPrice: z.number().default(Number.MAX_SAFE_INTEGER),
      evmNetworkId: z.number().default(1),
      basePriceMultiplier: z.number().default(1),
      issueCreatorMultiplier: z.number().default(1),
    })
    .default({}),
  commands: z.array(
    z.strictObject({
      name: z.string(),
      enabled: z.boolean(),
    })
  ),
  incentives: z
    .strictObject({
      comment: z
        .strictObject({
          elements: z.record(z.union(HtmlEntities), z.number()).default(allHtmlElementsSetToZero),
          totals: z
            .strictObject({
              character: z.number().default(0),
              word: z.number().default(0),
              sentence: z.number().default(0),
              paragraph: z.number().default(0),
              comment: z.number().default(0),
            })
            .default({}),
        })
        .default({}),
    })
    .default({}),
  labels: z
    .strictObject({
      time: z.array(z.strictObject({ name: z.string() })).default(defaultTimeLabels),
      priority: z.array(z.strictObject({ name: z.string() })).default(defaultPriorityLabels),
    })
    .default({}),
  miscellaneous: z
    .strictObject({
      maxConcurrentTasks: z.number().default(Number.MAX_SAFE_INTEGER),
      promotionComment: z.string().default(promotionComment),
      registerWalletWithVerification: z.boolean().default(false),
    })
    .default({}),
});

export type BotConfig = z.infer<typeof BotConfigSchema>;
*/

const StrictObject = (obj: Parameters<typeof T.Object>[0], options?: Parameters<typeof T.Object>[1]) =>
  T.Object(obj, { additionalProperties: false, default: {}, ...options });

export const EnvConfigSchema = StrictObject({
  WEBHOOK_PROXY_URL: T.String({ format: "uri" }),
  LOG_ENVIRONMENT: T.String({ default: "development" }),
  LOG_LEVEL: T.Enum(LogLevel),
  LOG_RETRY_LIMIT: T.Number({ default: 8 }),
  SUPABASE_URL: T.String({ format: "uri" }),
  SUPABASE_KEY: T.String(),
  X25519_PRIVATE_KEY: T.String(),
  PRIVATE_KEY: T.String(),
  APP_ID: T.Number(),
});

export type EnvConfig = Static<typeof EnvConfigSchema>;

export const BotConfigSchema = StrictObject({
  keys: StrictObject({
    evmPrivateEncrypted: T.String(),
    openAi: T.String(),
  }),
  features: StrictObject({
    assistivePricing: T.Boolean({ default: false }),
    defaultLabels: T.Array(T.String(), { default: [] }),
    newContributorGreeting: StrictObject({
      header: T.String({ default: defaultGreetingHeader }),
      displayHelpMenu: T.Boolean({ default: true }),
      footer: T.String({ default: promotionComment }),
    }),
    publicAccessControl: StrictObject({
      setLabel: T.Boolean({ default: true }),
      fundExternalClosedIssue: T.Boolean({ default: true }),
    }),
  }),
  timers: StrictObject({
    reviewDelayTolerance: T.String({ default: "1 day" }),
    taskStaleTimeoutDuration: T.String({ default: "1 month" }),
    taskFollowUpDuration: T.String({ default: "0.5 weeks" }),
    taskDisqualifyDuration: T.String({ default: "1 week" }),
  }),
  payments: StrictObject({
    maxPermitPrice: T.Number({ default: Number.MAX_SAFE_INTEGER }),
    evmNetworkId: T.Number({ default: 1 }),
    basePriceMultiplier: T.Number({ default: 1 }),
    issueCreatorMultiplier: T.Number({ default: 1 }),
  }),
  commands: T.Array(
    StrictObject({
      name: T.String(),
      enabled: T.Boolean({ default: false }),
    })
  ),
  incentives: StrictObject({
    comment: StrictObject({
      elements: T.Record(T.Union(HtmlEntities), T.Number(), { default: allHtmlElementsSetToZero }),
      totals: StrictObject({
        character: T.Number({ default: 0, minimum: 0 }),
        word: T.Number({ default: 0, minimum: 0 }),
        sentence: T.Number({ default: 0, minimum: 0 }),
        paragraph: T.Number({ default: 0, minimum: 0 }),
        comment: T.Number({ default: 0, minimum: 0 }),
      }),
    }),
  }),
  labels: StrictObject({
    time: T.Array(StrictObject({ name: T.String() }), { default: defaultTimeLabels }),
    priority: T.Array(StrictObject({ name: T.String() }), { default: defaultPriorityLabels }),
  }),
  miscellaneous: StrictObject({
    maxConcurrentTasks: T.Number({ default: Number.MAX_SAFE_INTEGER }),
    promotionComment: T.String({ default: promotionComment }),
    registerWalletWithVerification: T.Boolean({ default: false }),
  }),
});

export type BotConfig = Static<typeof BotConfigSchema>;
