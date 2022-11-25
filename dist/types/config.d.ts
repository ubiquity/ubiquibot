import { Static } from "@sinclair/typebox";
export declare const ConfigSchema: import("@sinclair/typebox").TObject<{
    price: import("@sinclair/typebox").TObject<{
        base: import("@sinclair/typebox").TNumber;
    }>;
}>;
export type BotConfig = Static<typeof ConfigSchema>;
