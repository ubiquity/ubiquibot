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

const RepositorySchema = Type.Object({});

const OrganizationSchema = Type.Object({
    login: Type.String(),
    id: Type.Number(),
    node_id: Type.String(),
    url: TURL,
    repos_url: TURL,
    events_url: TURL,
    hooks_url: TURL,
    issues_url: TURL,
    members_url: TURL,
    public_members_url: TURL,
    avatar_url: TURL,
    description: Type.String()
});


const InstallationSchema = Type.Object({
    id: Type.Number(),
    node_id: Type.String()
});

export const PayloadSchema = Type.Object({
    action: Type.String(),
    sender: SenderSchema,
    repository: RepositorySchema,
    organization: OrganizationSchema,
    installation: InstallationSchema,
})

export type Payload = Static<typeof PayloadSchema>;