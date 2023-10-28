import { Static, Type } from "@sinclair/typebox";
import { LogLevel } from "../adapters/supabase/helpers/tables/logs";
import { validHTMLElements } from "../handlers/comment/handlers/issue/valid-html-elements";

const o = Type.Object.bind(Type);
const a = Type.Array.bind(Type);
const s = Type.String.bind(Type);
const b = Type.Boolean.bind(Type);
const num = Type.Number.bind(Type);
const nil = Type.Null.bind(Type);
const record = Type.Record.bind(Type);
const optional = Type.Optional.bind(Type);
const only = { additionalProperties: false };
const either = Type.Union.bind(Type);

const HtmlEntities = either(validHTMLElements.map((value) => Type.Literal(value)));

const PrivateConfigurationValuesOnly = o(
  {
    keys: o(
      {
        evmPrivate: either([s(), nil()]),
        evmPrivateEncrypted: s(),
        evmPublic: either([s(), nil()]),
        openAi: s(),
        // supabaseUrl: (s()),
        supabase: s(),
      },
      only
    ),
  },
  only
);

export const PublicConfigurationValues = o(
  {
    logs: o({
      environment: s(),
      level: Type.Enum(LogLevel),
      retryLimit: num(),
    }),

    features: o(
      {
        assistivePricing: optional(b()),
        defaultLabels: optional(o(a(s()), only)),
        newContributorGreeting: optional(
          o(
            {
              // enabled: b(),
              header: s(),
              showHelpMenu: b(),
              footer: s(),
            },
            only
          )
        ),
        publicAccessControl: optional(
          o(
            {
              setLabel: b(),
              fundExternalClosedIssue: b(),
            },
            only
          )
        ),
      },
      only
    ),

    timers: o(
      {
        reviewDelayTolerance: optional(s()),
        taskStaleTimeoutDuration: optional(s()),
        taskFollowUpDuration: optional(s()),
        taskDisqualifyDuration: optional(s()),
      },
      only
    ),

    payments: o(
      {
        maxPermitPrice: num(),
        evmNetworkId: num(),
        basePriceMultiplier: num(),
        issueCreatorMultiplier: num(),
      },
      only
    ),

    commands: o(
      a(
        o(
          {
            name: s(),
            enabled: b(),
          },
          only
        )
      ),
      only
    ),

    incentives: o(
      {
        comment: o(
          {
            elements: record(HtmlEntities, num()),
            totals: optional(
              o(
                {
                  character: optional(num()),
                  word: optional(num()),
                  sentence: optional(num()),
                  paragraph: optional(num()),
                  comment: optional(num()),
                },
                only
              )
            ),
          },
          only
        ),
      },
      only
    ),

    labels: o(
      {
        time: optional(a(o({ name: s() }, only))),
        priority: optional(a(o({ name: s() }, only))),
      },
      only
    ),

    miscellaneous: o(
      {
        maxConcurrentTasks: optional(o(num(), only)),
        promotionComment: optional(o(s(), only)),
        registerWalletWithVerification: optional(o(b(), only)),
      },
      only
    ),
  },
  only
);

// type PrivateConfigurationTypesOnly = Static<typeof PrivateConfigurationValuesOnly>;
export type PublicConfigurationTypes = Static<typeof PublicConfigurationValues>;
const AllConfigurationValues = Type.Intersect([PrivateConfigurationValuesOnly, PublicConfigurationValues]);
export type AllConfigurationTypes = Static<typeof AllConfigurationValues>;
