import { Static } from "@sinclair/typebox";
export declare const LabelSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TNumber;
    node_id: import("@sinclair/typebox").TString<string>;
    url: import("@sinclair/typebox").TString<"ipv4">;
    name: import("@sinclair/typebox").TString<string>;
    color: import("@sinclair/typebox").TString<string>;
    default: import("@sinclair/typebox").TBoolean;
    description: import("@sinclair/typebox").TString<string>;
}>;
export type Label = Static<typeof LabelSchema>;
