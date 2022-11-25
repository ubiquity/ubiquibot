// https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads

import { Static, Type} from "@sinclair/typebox";
import { TURL } from "./shared";

const SenderSchema = Type.Object({
    login: Type.String(),
    id: Type.Number(),
    node_id: Type.String(),
    avatar_url: TURL,
    gravatar_id: Type.String(),
    url: TURL,
    html_url: TURL,
    followers_url: TURL,
    following_url: TURL,
    gists_url: TURL,
    starred_url: TURL,
    subscriptions_url: TURL,
    organizations_url: TURL,
    repos_url: TURL,
    events_url: TURL,
    received_events_url: TURL,
    type: Type.Union([Type.Literal("User"), Type.Literal("Bot"), Type.Literal("Organization")]),
    site_admin: Type.Boolean(),
});
export type Sender = Static<typeof SenderSchema>;

const RepositorySchema = Type.Object({});
export type Repository = Static<typeof RepositorySchema>

const OrganizationSchema = Type.Object({});
export type Organization = Static<typeof OrganizationSchema>;

const InstallationSchema = Type.Object({});
export type Installation = Static<typeof InstallationSchema>;
