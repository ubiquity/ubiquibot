import { Type as T, Static, TProperties, ObjectOptions, StringOptions, StaticDecode } from "@sinclair/typebox";
import { LogLevel } from "../types";
import { validHTMLElements } from "../handlers/comment/handlers/issue/valid-html-elements";
import { userCommands } from "../handlers";
import { ajv } from "../utils/ajv";
import ms from "ms";

const promotionComment =
  "###### If you enjoy the DevPool experience, please follow [Ubiquity on GitHub](https://github.com/ubiquity) and star [this repo](https://github.com/ubiquity/devpool-directory) to show your support. It helps a lot!";
const defaultGreetingHeader =
  "Thank you for contributing! Please be sure to set your wallet address before completing your first task so that you can collect your reward.";

const HtmlEntities = validHTMLElements.map((value) => T.Literal(value));

const allHtmlElementsSetToZero = validHTMLElements.reduce((accumulator, current) => {
  accumulator[current] = 0;
  return accumulator;
}, {} as Record<keyof HTMLElementTagNameMap, number>);

const allCommands = userCommands(false).map((cmd) => ({ name: cmd.id.replace("/", ""), enabled: false }));

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

function StrictObject<T extends TProperties>(obj: T, options?: ObjectOptions) {
  return T.Object<T>(obj, { additionalProperties: false, default: {}, ...options });
}

export function stringDuration(options?: StringOptions) {
  return T.Transform(T.String(options))
    .Decode((value) => {
      const decoded = ms(value);
      if (decoded === undefined || isNaN(decoded)) {
        throw new Error(`Invalid duration string: ${value}`);
      }
      return ms(value);
    })
    .Encode((value) => {
      return ms(value);
    });
}

export const EnvConfigSchema = T.Object({
  WEBHOOK_PROXY_URL: T.String({ format: "uri" }),
  LOG_ENVIRONMENT: T.String({ default: "production" }),
  LOG_LEVEL: T.Enum(LogLevel, { default: LogLevel.SILLY }),
  LOG_RETRY_LIMIT: T.Number({ default: 8 }),
  SUPABASE_URL: T.String({ format: "uri" }),
  SUPABASE_KEY: T.String(),
  X25519_PRIVATE_KEY: T.String(),
  PRIVATE_KEY: T.String(),
  APP_ID: T.Number(),
});

export const validateEnvConfig = ajv.compile(EnvConfigSchema);
export type EnvConfig = Static<typeof EnvConfigSchema>;

export const BotConfigSchema = StrictObject(
  {
    keys: StrictObject({
      evmPrivateEncrypted: T.Optional(T.String()),
      openAi: T.Optional(T.String()),
    }),
    features: StrictObject({
      assistivePricing: T.Boolean({ default: false }),
      defaultLabels: T.Array(T.String(), { default: [] }),
      newContributorGreeting: StrictObject({
        enabled: T.Boolean({ default: false }),
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
      reviewDelayTolerance: stringDuration({ default: "1 day" }),
      taskStaleTimeoutDuration: stringDuration({ default: "4 weeks" }),
      taskFollowUpDuration: stringDuration({ default: "0.5 weeks" }),
      taskDisqualifyDuration: stringDuration({ default: "1 week" }),
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
        enabled: T.Boolean(),
      }),
      { default: allCommands }
    ),
    incentives: StrictObject({
      comment: StrictObject({
        elements: T.Record(T.Union(HtmlEntities), T.Number({ default: 0 }), { default: allHtmlElementsSetToZero }),
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
      openAiTokenLimit: T.Number({ default: 100000 }),
    }),
  },
  { default: undefined } // top level object can't have default!
);
export const validateBotConfig = ajv.compile(BotConfigSchema);

export type BotConfig = StaticDecode<typeof BotConfigSchema>;
