create extension if not exists "pg_cron" with schema "public" version '1.4-1';

create type "public"."github_node_type" as enum ('App', 'Bot', 'CheckRun', 'CheckSuite', 'ClosedEvent', 'CodeOfConduct', 'Commit', 'CommitComment', 'CommitContributionsByRepository', 'ContributingGuidelines', 'ConvertToDraftEvent', 'CreatedCommitContribution', 'CreatedIssueContribution', 'CreatedPullRequestContribution', 'CreatedPullRequestReviewContribution', 'CreatedRepositoryContribution', 'CrossReferencedEvent', 'Discussion', 'DiscussionComment', 'Enterprise', 'EnterpriseUserAccount', 'FundingLink', 'Gist', 'Issue', 'IssueComment', 'JoinedGitHubContribution', 'Label', 'License', 'Mannequin', 'MarketplaceCategory', 'MarketplaceListing', 'MergeQueue', 'MergedEvent', 'MigrationSource', 'Milestone', 'Organization', 'PackageFile', 'Project', 'ProjectCard', 'ProjectColumn', 'ProjectV2', 'PullRequest', 'PullRequestCommit', 'PullRequestReview', 'PullRequestReviewComment', 'ReadyForReviewEvent', 'Release', 'ReleaseAsset', 'Repository', 'RepositoryContactLink', 'RepositoryTopic', 'RestrictedContribution', 'ReviewDismissedEvent', 'SecurityAdvisoryReference', 'SocialAccount', 'SponsorsListing', 'Team', 'TeamDiscussion', 'TeamDiscussionComment', 'User', 'Workflow', 'WorkflowRun', 'WorkflowRunFile');

create sequence if not exists "public"."access_id_seq";

create sequence if not exists "public"."credits_id_seq";

create sequence if not exists "public"."debits_id_seq";

create sequence if not exists "public"."location_id_seq1";

create sequence if not exists "public"."logs_id_seq";

create sequence if not exists "public"."new_access_id_seq";

create sequence if not exists "public"."new_debits_id_seq";

create sequence if not exists "public"."new_logs_id_seq";

create sequence if not exists "public"."new_partners_id_seq";

create sequence if not exists "public"."new_permits_id_seq";

create sequence if not exists "public"."new_tokens_id_seq";

create sequence if not exists "public"."new_tokens_network_seq";

create sequence if not exists "public"."new_users_id_seq";

create sequence if not exists "public"."new_wallets_id_seq";

create sequence if not exists "public"."partners_id_seq";

create sequence if not exists "public"."permits_id_seq";

create sequence if not exists "public"."settlements_id_seq";

create sequence if not exists "public"."tokens_id_seq";

create sequence if not exists "public"."unauthorized_label_changes_id_seq";

create sequence if not exists "public"."users_id_seq";

create sequence if not exists "public"."wallets_id_seq";

create table "public"."access" (
    "id" integer not null default nextval('access_id_seq'::regclass),
    "created" timestamp with time zone not null default now(),
    "updated" timestamp with time zone,
    "user_id" integer not null,
    "location_id" integer,
    "multiplier" smallint not null default '1'::smallint,
    "labels" json,
    "multiplier_reason" text
);


alter table "public"."access" enable row level security;

create table "public"."credits" (
    "id" integer not null default nextval('credits_id_seq'::regclass),
    "created" timestamp with time zone not null default now(),
    "updated" timestamp with time zone,
    "amount" numeric not null,
    "permit_id" integer,
    "location_id" integer
);


alter table "public"."credits" enable row level security;

create table "public"."debits" (
    "id" integer not null default nextval('debits_id_seq'::regclass),
    "created" timestamp with time zone not null default now(),
    "updated" timestamp with time zone,
    "amount" numeric not null,
    "location_id" integer,
    "token_id" integer
);


alter table "public"."debits" enable row level security;

create table "public"."labels" (
    "id" integer not null default nextval('unauthorized_label_changes_id_seq'::regclass),
    "created" timestamp with time zone not null default now(),
    "updated" timestamp with time zone default now(),
    "label_from" text,
    "label_to" text,
    "authorized" boolean,
    "location_id" integer
);


alter table "public"."labels" enable row level security;

create table "public"."locations" (
    "id" integer not null default nextval('location_id_seq1'::regclass),
    "node_id" character varying(255),
    "node_type" character varying(255),
    "updated" timestamp with time zone,
    "created" timestamp with time zone not null default now(),
    "node_url" text,
    "user_id" integer,
    "repository_id" integer,
    "organization_id" integer,
    "comment_id" integer,
    "issue_id" integer
);


alter table "public"."locations" enable row level security;

create table "public"."logs" (
    "id" integer not null default nextval('logs_id_seq'::regclass),
    "created" timestamp with time zone not null default now(),
    "updated" timestamp with time zone,
    "log" text not null,
    "location_id" integer,
    "level" text,
    "metadata" jsonb
);


alter table "public"."logs" enable row level security;

create table "public"."partners" (
    "id" integer not null default nextval('partners_id_seq'::regclass),
    "created" timestamp with time zone not null default now(),
    "updated" timestamp with time zone,
    "wallet_id" integer,
    "location_id" integer
);


alter table "public"."partners" enable row level security;

create table "public"."permits" (
    "id" integer not null default nextval('permits_id_seq'::regclass),
    "created" timestamp with time zone not null default now(),
    "updated" timestamp with time zone,
    "amount" text not null,
    "nonce" text not null,
    "deadline" text not null,
    "signature" character(132) not null,
    "token_id" integer,
    "partner_id" integer,
    "beneficiary_id" integer not null,
    "transaction" character(66),
    "location_id" integer
);


alter table "public"."permits" enable row level security;

create table "public"."settlements" (
    "id" integer not null default nextval('settlements_id_seq'::regclass),
    "created" timestamp with time zone not null default now(),
    "updated" timestamp with time zone,
    "user_id" integer not null,
    "location_id" integer,
    "credit_id" integer,
    "debit_id" integer
);


alter table "public"."settlements" enable row level security;

create table "public"."tokens" (
    "id" integer not null default nextval('tokens_id_seq'::regclass),
    "created" timestamp with time zone not null default now(),
    "updated" timestamp with time zone,
    "network" smallint not null default nextval('new_tokens_network_seq'::regclass),
    "address" character(42) not null,
    "location_id" integer
);


alter table "public"."tokens" enable row level security;

create table "public"."users" (
    "id" integer not null default nextval('users_id_seq'::regclass),
    "created" timestamp with time zone not null default now(),
    "updated" timestamp with time zone,
    "wallet_id" integer,
    "location_id" integer
);


alter table "public"."users" enable row level security;

create table "public"."wallets" (
    "id" integer not null default nextval('wallets_id_seq'::regclass),
    "created" timestamp with time zone not null default now(),
    "updated" timestamp with time zone,
    "address" character(42),
    "location_id" integer
);


alter table "public"."wallets" enable row level security;

alter sequence "public"."credits_id_seq" owned by "public"."credits"."id";

alter sequence "public"."location_id_seq1" owned by "public"."locations"."id";

alter sequence "public"."new_access_id_seq" owned by "public"."access"."id";

alter sequence "public"."new_debits_id_seq" owned by "public"."debits"."id";

alter sequence "public"."new_logs_id_seq" owned by "public"."logs"."id";

alter sequence "public"."new_partners_id_seq" owned by "public"."partners"."id";

alter sequence "public"."new_permits_id_seq" owned by "public"."permits"."id";

alter sequence "public"."new_tokens_id_seq" owned by "public"."tokens"."id";

alter sequence "public"."new_tokens_network_seq" owned by "public"."tokens"."network";

alter sequence "public"."new_users_id_seq" owned by "public"."users"."id";

alter sequence "public"."new_wallets_id_seq" owned by "public"."wallets"."id";

alter sequence "public"."settlements_id_seq" owned by "public"."settlements"."id";

alter sequence "public"."unauthorized_label_changes_id_seq" owned by "public"."labels"."id";

CREATE UNIQUE INDEX credits_pkey ON public.credits USING btree (id);

CREATE UNIQUE INDEX location_node_id_node_type_key ON public.locations USING btree (node_id, node_type);

CREATE UNIQUE INDEX location_pkey1 ON public.locations USING btree (id);

CREATE UNIQUE INDEX location_unique_node ON public.locations USING btree (node_id, node_type);

CREATE UNIQUE INDEX new_access_pkey ON public.access USING btree (id);

CREATE UNIQUE INDEX new_debits_pkey ON public.debits USING btree (id);

CREATE UNIQUE INDEX new_logs_pkey ON public.logs USING btree (id);

CREATE UNIQUE INDEX new_partners_pkey ON public.partners USING btree (id);

CREATE UNIQUE INDEX new_permits_pkey ON public.permits USING btree (id);

CREATE UNIQUE INDEX new_tokens_pkey ON public.tokens USING btree (id);

CREATE UNIQUE INDEX new_users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX new_wallets_pkey ON public.wallets USING btree (id);

CREATE UNIQUE INDEX new_wallets_wallet_key ON public.wallets USING btree (address);

CREATE UNIQUE INDEX partners_wallet_key ON public.partners USING btree (wallet_id);

CREATE UNIQUE INDEX permits_nonce_key ON public.permits USING btree (nonce);

CREATE UNIQUE INDEX permits_signature_key ON public.permits USING btree (signature);

CREATE UNIQUE INDEX permits_transaction_key ON public.permits USING btree (transaction);

CREATE UNIQUE INDEX settlements_pkey ON public.settlements USING btree (id);

CREATE UNIQUE INDEX unauthorized_label_changes_pkey ON public.labels USING btree (id);

alter table "public"."access" add constraint "new_access_pkey" PRIMARY KEY using index "new_access_pkey";

alter table "public"."credits" add constraint "credits_pkey" PRIMARY KEY using index "credits_pkey";

alter table "public"."debits" add constraint "new_debits_pkey" PRIMARY KEY using index "new_debits_pkey";

alter table "public"."labels" add constraint "unauthorized_label_changes_pkey" PRIMARY KEY using index "unauthorized_label_changes_pkey";

alter table "public"."locations" add constraint "location_pkey1" PRIMARY KEY using index "location_pkey1";

alter table "public"."logs" add constraint "new_logs_pkey" PRIMARY KEY using index "new_logs_pkey";

alter table "public"."partners" add constraint "new_partners_pkey" PRIMARY KEY using index "new_partners_pkey";

alter table "public"."permits" add constraint "new_permits_pkey" PRIMARY KEY using index "new_permits_pkey";

alter table "public"."settlements" add constraint "settlements_pkey" PRIMARY KEY using index "settlements_pkey";

alter table "public"."tokens" add constraint "new_tokens_pkey" PRIMARY KEY using index "new_tokens_pkey";

alter table "public"."users" add constraint "new_users_pkey" PRIMARY KEY using index "new_users_pkey";

alter table "public"."wallets" add constraint "new_wallets_pkey" PRIMARY KEY using index "new_wallets_pkey";

alter table "public"."access" add constraint "access_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."access" validate constraint "access_user_id_fkey";

alter table "public"."access" add constraint "fk_access_location" FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE not valid;

alter table "public"."access" validate constraint "fk_access_location";

alter table "public"."credits" add constraint "credits_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id) not valid;

alter table "public"."credits" validate constraint "credits_location_id_fkey";

alter table "public"."credits" add constraint "credits_permit_id_fkey" FOREIGN KEY (permit_id) REFERENCES permits(id) not valid;

alter table "public"."credits" validate constraint "credits_permit_id_fkey";

alter table "public"."debits" add constraint "debits_token_id_fkey" FOREIGN KEY (token_id) REFERENCES tokens(id) not valid;

alter table "public"."debits" validate constraint "debits_token_id_fkey";

alter table "public"."debits" add constraint "fk_debits_location" FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE not valid;

alter table "public"."debits" validate constraint "fk_debits_location";

alter table "public"."labels" add constraint "labels_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id) not valid;

alter table "public"."labels" validate constraint "labels_location_id_fkey";

alter table "public"."locations" add constraint "location_node_id_node_type_key" UNIQUE using index "location_node_id_node_type_key";

alter table "public"."locations" add constraint "location_node_type_check1" CHECK (((node_type)::text = ANY ((ARRAY['App'::character varying, 'Bot'::character varying, 'CheckRun'::character varying, 'CheckSuite'::character varying, 'ClosedEvent'::character varying, 'CodeOfConduct'::character varying, 'Commit'::character varying, 'CommitComment'::character varying, 'CommitContributionsByRepository'::character varying, 'ContributingGuidelines'::character varying, 'ConvertToDraftEvent'::character varying, 'CreatedCommitContribution'::character varying, 'CreatedIssueContribution'::character varying, 'CreatedPullRequestContribution'::character varying, 'CreatedPullRequestReviewContribution'::character varying, 'CreatedRepositoryContribution'::character varying, 'CrossReferencedEvent'::character varying, 'Discussion'::character varying, 'DiscussionComment'::character varying, 'Enterprise'::character varying, 'EnterpriseUserAccount'::character varying, 'FundingLink'::character varying, 'Gist'::character varying, 'Issue'::character varying, 'IssueComment'::character varying, 'JoinedGitHubContribution'::character varying, 'Label'::character varying, 'License'::character varying, 'Mannequin'::character varying, 'MarketplaceCategory'::character varying, 'MarketplaceListing'::character varying, 'MergeQueue'::character varying, 'MergedEvent'::character varying, 'MigrationSource'::character varying, 'Milestone'::character varying, 'Organization'::character varying, 'PackageFile'::character varying, 'Project'::character varying, 'ProjectCard'::character varying, 'ProjectColumn'::character varying, 'ProjectV2'::character varying, 'PullRequest'::character varying, 'PullRequestCommit'::character varying, 'PullRequestReview'::character varying, 'PullRequestReviewComment'::character varying, 'ReadyForReviewEvent'::character varying, 'Release'::character varying, 'ReleaseAsset'::character varying, 'Repository'::character varying, 'RepositoryContactLink'::character varying, 'RepositoryTopic'::character varying, 'RestrictedContribution'::character varying, 'ReviewDismissedEvent'::character varying, 'SecurityAdvisoryReference'::character varying, 'SocialAccount'::character varying, 'SponsorsListing'::character varying, 'Team'::character varying, 'TeamDiscussion'::character varying, 'TeamDiscussionComment'::character varying, 'User'::character varying, 'Workflow'::character varying, 'WorkflowRun'::character varying, 'WorkflowRunFile'::character varying])::text[]))) not valid;

alter table "public"."locations" validate constraint "location_node_type_check1";

alter table "public"."locations" add constraint "location_unique_node" UNIQUE using index "location_unique_node";

alter table "public"."locations" add constraint "locations_node_url_check" CHECK ((node_url ~~ 'https://github.com/%'::text)) not valid;

alter table "public"."locations" validate constraint "locations_node_url_check";

alter table "public"."logs" add constraint "fk_logs_location" FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE not valid;

alter table "public"."logs" validate constraint "fk_logs_location";

alter table "public"."partners" add constraint "fk_partners_location" FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE not valid;

alter table "public"."partners" validate constraint "fk_partners_location";

alter table "public"."partners" add constraint "partners_wallet_id_fkey" FOREIGN KEY (wallet_id) REFERENCES wallets(id) not valid;

alter table "public"."partners" validate constraint "partners_wallet_id_fkey";

alter table "public"."partners" add constraint "partners_wallet_key" UNIQUE using index "partners_wallet_key";

alter table "public"."permits" add constraint "fk_permits_location" FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE not valid;

alter table "public"."permits" validate constraint "fk_permits_location";

alter table "public"."permits" add constraint "permits_beneficiary_id_fkey" FOREIGN KEY (beneficiary_id) REFERENCES users(id) not valid;

alter table "public"."permits" validate constraint "permits_beneficiary_id_fkey";

alter table "public"."permits" add constraint "permits_nonce_key" UNIQUE using index "permits_nonce_key";

alter table "public"."permits" add constraint "permits_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES partners(id) not valid;

alter table "public"."permits" validate constraint "permits_partner_id_fkey";

alter table "public"."permits" add constraint "permits_signature_key" UNIQUE using index "permits_signature_key";

alter table "public"."permits" add constraint "permits_token_fkey" FOREIGN KEY (token_id) REFERENCES tokens(id) not valid;

alter table "public"."permits" validate constraint "permits_token_fkey";

alter table "public"."permits" add constraint "permits_transaction_key" UNIQUE using index "permits_transaction_key";

alter table "public"."settlements" add constraint "fk_settlements_location" FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE not valid;

alter table "public"."settlements" validate constraint "fk_settlements_location";

alter table "public"."settlements" add constraint "settlements_credit_id_fkey" FOREIGN KEY (credit_id) REFERENCES credits(id) not valid;

alter table "public"."settlements" validate constraint "settlements_credit_id_fkey";

alter table "public"."settlements" add constraint "settlements_debit_id_fkey" FOREIGN KEY (debit_id) REFERENCES debits(id) not valid;

alter table "public"."settlements" validate constraint "settlements_debit_id_fkey";

alter table "public"."settlements" add constraint "settlements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."settlements" validate constraint "settlements_user_id_fkey";

alter table "public"."tokens" add constraint "tokens_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id) not valid;

alter table "public"."tokens" validate constraint "tokens_location_id_fkey";

alter table "public"."users" add constraint "users_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id) not valid;

alter table "public"."users" validate constraint "users_location_id_fkey";

alter table "public"."users" add constraint "users_wallet_id_fkey" FOREIGN KEY (wallet_id) REFERENCES wallets(id) not valid;

alter table "public"."users" validate constraint "users_wallet_id_fkey";

alter table "public"."wallets" add constraint "new_wallets_wallet_key" UNIQUE using index "new_wallets_wallet_key";

alter table "public"."wallets" add constraint "wallets_address_check" CHECK ((length(address) = 42)) not valid;

alter table "public"."wallets" validate constraint "wallets_address_check";

alter table "public"."wallets" add constraint "wallets_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id) not valid;

alter table "public"."wallets" validate constraint "wallets_location_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_null_permit_tx_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$BEGIN
  IF NEW.transaction <> OLD.transaction AND OLD.transaction IS NOT NULL THEN
    RAISE EXCEPTION 'updating transaction hash is not allowed';
  END IF;

  RETURN NEW;
END;$function$
;

create or replace view "public"."issues_view" as  SELECT DISTINCT ON (locations.issue_id) locations.id,
    locations.node_id,
    locations.node_type,
    locations.updated,
    locations.created,
    locations.node_url,
    locations.user_id,
    locations.repository_id,
    locations.organization_id,
    locations.comment_id,
    locations.issue_id
   FROM locations
  WHERE ((locations.node_url IS NOT NULL) AND (locations.repository_id IS NOT NULL));


CREATE OR REPLACE FUNCTION public.read_secret(secret_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  secret text;
begin
  if current_setting('role') != 'service_role' then
    raise exception 'authentication required';
  end if;

  select decrypted_secret from vault.decrypted_secrets where name =
  secret_name into secret;
  return secret;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.updated()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$BEGIN
    NEW.updated = NOW();
    RETURN NEW;
END;$function$
;

grant delete on table "public"."access" to "anon";

grant insert on table "public"."access" to "anon";

grant references on table "public"."access" to "anon";

grant select on table "public"."access" to "anon";

grant trigger on table "public"."access" to "anon";

grant truncate on table "public"."access" to "anon";

grant update on table "public"."access" to "anon";

grant delete on table "public"."access" to "authenticated";

grant insert on table "public"."access" to "authenticated";

grant references on table "public"."access" to "authenticated";

grant select on table "public"."access" to "authenticated";

grant trigger on table "public"."access" to "authenticated";

grant truncate on table "public"."access" to "authenticated";

grant update on table "public"."access" to "authenticated";

grant delete on table "public"."access" to "service_role";

grant insert on table "public"."access" to "service_role";

grant references on table "public"."access" to "service_role";

grant select on table "public"."access" to "service_role";

grant trigger on table "public"."access" to "service_role";

grant truncate on table "public"."access" to "service_role";

grant update on table "public"."access" to "service_role";

grant delete on table "public"."credits" to "anon";

grant insert on table "public"."credits" to "anon";

grant references on table "public"."credits" to "anon";

grant select on table "public"."credits" to "anon";

grant trigger on table "public"."credits" to "anon";

grant truncate on table "public"."credits" to "anon";

grant update on table "public"."credits" to "anon";

grant delete on table "public"."credits" to "authenticated";

grant insert on table "public"."credits" to "authenticated";

grant references on table "public"."credits" to "authenticated";

grant select on table "public"."credits" to "authenticated";

grant trigger on table "public"."credits" to "authenticated";

grant truncate on table "public"."credits" to "authenticated";

grant update on table "public"."credits" to "authenticated";

grant delete on table "public"."credits" to "service_role";

grant insert on table "public"."credits" to "service_role";

grant references on table "public"."credits" to "service_role";

grant select on table "public"."credits" to "service_role";

grant trigger on table "public"."credits" to "service_role";

grant truncate on table "public"."credits" to "service_role";

grant update on table "public"."credits" to "service_role";

grant delete on table "public"."debits" to "anon";

grant insert on table "public"."debits" to "anon";

grant references on table "public"."debits" to "anon";

grant select on table "public"."debits" to "anon";

grant trigger on table "public"."debits" to "anon";

grant truncate on table "public"."debits" to "anon";

grant update on table "public"."debits" to "anon";

grant delete on table "public"."debits" to "authenticated";

grant insert on table "public"."debits" to "authenticated";

grant references on table "public"."debits" to "authenticated";

grant select on table "public"."debits" to "authenticated";

grant trigger on table "public"."debits" to "authenticated";

grant truncate on table "public"."debits" to "authenticated";

grant update on table "public"."debits" to "authenticated";

grant delete on table "public"."debits" to "service_role";

grant insert on table "public"."debits" to "service_role";

grant references on table "public"."debits" to "service_role";

grant select on table "public"."debits" to "service_role";

grant trigger on table "public"."debits" to "service_role";

grant truncate on table "public"."debits" to "service_role";

grant update on table "public"."debits" to "service_role";

grant delete on table "public"."labels" to "anon";

grant insert on table "public"."labels" to "anon";

grant references on table "public"."labels" to "anon";

grant select on table "public"."labels" to "anon";

grant trigger on table "public"."labels" to "anon";

grant truncate on table "public"."labels" to "anon";

grant update on table "public"."labels" to "anon";

grant delete on table "public"."labels" to "authenticated";

grant insert on table "public"."labels" to "authenticated";

grant references on table "public"."labels" to "authenticated";

grant select on table "public"."labels" to "authenticated";

grant trigger on table "public"."labels" to "authenticated";

grant truncate on table "public"."labels" to "authenticated";

grant update on table "public"."labels" to "authenticated";

grant delete on table "public"."labels" to "service_role";

grant insert on table "public"."labels" to "service_role";

grant references on table "public"."labels" to "service_role";

grant select on table "public"."labels" to "service_role";

grant trigger on table "public"."labels" to "service_role";

grant truncate on table "public"."labels" to "service_role";

grant update on table "public"."labels" to "service_role";

grant delete on table "public"."locations" to "anon";

grant insert on table "public"."locations" to "anon";

grant references on table "public"."locations" to "anon";

grant select on table "public"."locations" to "anon";

grant trigger on table "public"."locations" to "anon";

grant truncate on table "public"."locations" to "anon";

grant update on table "public"."locations" to "anon";

grant delete on table "public"."locations" to "authenticated";

grant insert on table "public"."locations" to "authenticated";

grant references on table "public"."locations" to "authenticated";

grant select on table "public"."locations" to "authenticated";

grant trigger on table "public"."locations" to "authenticated";

grant truncate on table "public"."locations" to "authenticated";

grant update on table "public"."locations" to "authenticated";

grant delete on table "public"."locations" to "service_role";

grant insert on table "public"."locations" to "service_role";

grant references on table "public"."locations" to "service_role";

grant select on table "public"."locations" to "service_role";

grant trigger on table "public"."locations" to "service_role";

grant truncate on table "public"."locations" to "service_role";

grant update on table "public"."locations" to "service_role";

grant delete on table "public"."logs" to "anon";

grant insert on table "public"."logs" to "anon";

grant references on table "public"."logs" to "anon";

grant select on table "public"."logs" to "anon";

grant trigger on table "public"."logs" to "anon";

grant truncate on table "public"."logs" to "anon";

grant update on table "public"."logs" to "anon";

grant delete on table "public"."logs" to "authenticated";

grant insert on table "public"."logs" to "authenticated";

grant references on table "public"."logs" to "authenticated";

grant select on table "public"."logs" to "authenticated";

grant trigger on table "public"."logs" to "authenticated";

grant truncate on table "public"."logs" to "authenticated";

grant update on table "public"."logs" to "authenticated";

grant delete on table "public"."logs" to "service_role";

grant insert on table "public"."logs" to "service_role";

grant references on table "public"."logs" to "service_role";

grant select on table "public"."logs" to "service_role";

grant trigger on table "public"."logs" to "service_role";

grant truncate on table "public"."logs" to "service_role";

grant update on table "public"."logs" to "service_role";

grant delete on table "public"."partners" to "anon";

grant insert on table "public"."partners" to "anon";

grant references on table "public"."partners" to "anon";

grant select on table "public"."partners" to "anon";

grant trigger on table "public"."partners" to "anon";

grant truncate on table "public"."partners" to "anon";

grant update on table "public"."partners" to "anon";

grant delete on table "public"."partners" to "authenticated";

grant insert on table "public"."partners" to "authenticated";

grant references on table "public"."partners" to "authenticated";

grant select on table "public"."partners" to "authenticated";

grant trigger on table "public"."partners" to "authenticated";

grant truncate on table "public"."partners" to "authenticated";

grant update on table "public"."partners" to "authenticated";

grant delete on table "public"."partners" to "service_role";

grant insert on table "public"."partners" to "service_role";

grant references on table "public"."partners" to "service_role";

grant select on table "public"."partners" to "service_role";

grant trigger on table "public"."partners" to "service_role";

grant truncate on table "public"."partners" to "service_role";

grant update on table "public"."partners" to "service_role";

grant delete on table "public"."permits" to "anon";

grant insert on table "public"."permits" to "anon";

grant references on table "public"."permits" to "anon";

grant select on table "public"."permits" to "anon";

grant trigger on table "public"."permits" to "anon";

grant truncate on table "public"."permits" to "anon";

grant update on table "public"."permits" to "anon";

grant references on table "public"."permits" to "authenticated";

grant select on table "public"."permits" to "authenticated";

grant trigger on table "public"."permits" to "authenticated";

grant truncate on table "public"."permits" to "authenticated";

grant delete on table "public"."permits" to "service_role";

grant insert on table "public"."permits" to "service_role";

grant references on table "public"."permits" to "service_role";

grant select on table "public"."permits" to "service_role";

grant trigger on table "public"."permits" to "service_role";

grant truncate on table "public"."permits" to "service_role";

grant update on table "public"."permits" to "service_role";

grant delete on table "public"."settlements" to "anon";

grant insert on table "public"."settlements" to "anon";

grant references on table "public"."settlements" to "anon";

grant select on table "public"."settlements" to "anon";

grant trigger on table "public"."settlements" to "anon";

grant truncate on table "public"."settlements" to "anon";

grant update on table "public"."settlements" to "anon";

grant delete on table "public"."settlements" to "authenticated";

grant insert on table "public"."settlements" to "authenticated";

grant references on table "public"."settlements" to "authenticated";

grant select on table "public"."settlements" to "authenticated";

grant trigger on table "public"."settlements" to "authenticated";

grant truncate on table "public"."settlements" to "authenticated";

grant update on table "public"."settlements" to "authenticated";

grant delete on table "public"."settlements" to "service_role";

grant insert on table "public"."settlements" to "service_role";

grant references on table "public"."settlements" to "service_role";

grant select on table "public"."settlements" to "service_role";

grant trigger on table "public"."settlements" to "service_role";

grant truncate on table "public"."settlements" to "service_role";

grant update on table "public"."settlements" to "service_role";

grant delete on table "public"."tokens" to "anon";

grant insert on table "public"."tokens" to "anon";

grant references on table "public"."tokens" to "anon";

grant select on table "public"."tokens" to "anon";

grant trigger on table "public"."tokens" to "anon";

grant truncate on table "public"."tokens" to "anon";

grant update on table "public"."tokens" to "anon";

grant delete on table "public"."tokens" to "authenticated";

grant insert on table "public"."tokens" to "authenticated";

grant references on table "public"."tokens" to "authenticated";

grant select on table "public"."tokens" to "authenticated";

grant trigger on table "public"."tokens" to "authenticated";

grant truncate on table "public"."tokens" to "authenticated";

grant update on table "public"."tokens" to "authenticated";

grant delete on table "public"."tokens" to "service_role";

grant insert on table "public"."tokens" to "service_role";

grant references on table "public"."tokens" to "service_role";

grant select on table "public"."tokens" to "service_role";

grant trigger on table "public"."tokens" to "service_role";

grant truncate on table "public"."tokens" to "service_role";

grant update on table "public"."tokens" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

grant delete on table "public"."wallets" to "anon";

grant insert on table "public"."wallets" to "anon";

grant references on table "public"."wallets" to "anon";

grant select on table "public"."wallets" to "anon";

grant trigger on table "public"."wallets" to "anon";

grant truncate on table "public"."wallets" to "anon";

grant update on table "public"."wallets" to "anon";

grant delete on table "public"."wallets" to "authenticated";

grant insert on table "public"."wallets" to "authenticated";

grant references on table "public"."wallets" to "authenticated";

grant select on table "public"."wallets" to "authenticated";

grant trigger on table "public"."wallets" to "authenticated";

grant truncate on table "public"."wallets" to "authenticated";

grant update on table "public"."wallets" to "authenticated";

grant delete on table "public"."wallets" to "service_role";

grant insert on table "public"."wallets" to "service_role";

grant references on table "public"."wallets" to "service_role";

grant select on table "public"."wallets" to "service_role";

grant trigger on table "public"."wallets" to "service_role";

grant truncate on table "public"."wallets" to "service_role";

grant update on table "public"."wallets" to "service_role";

create policy "Enable read access for all users"
on "public"."permits"
as permissive
for select
to public
using (true);

create policy "Enable read access for all users"
	on "public"."locations"
	as permissive
	for select
	to public
	using (true);


create policy "Enable read access for all users"
	on "public"."tokens"
	as permissive
	for select
	to public
	using (true);


create policy "Enable read access for all users"
	on "public"."users"
	as permissive
	for select
	to public
	using (true);


create policy "Enable read access for all users"
	on "public"."wallets"
	as permissive
	for select
	to public
	using (true);


CREATE TRIGGER handle_updated_trigger BEFORE UPDATE ON public.access FOR EACH ROW EXECUTE FUNCTION updated();

CREATE TRIGGER handle_updated_trigger BEFORE UPDATE ON public.credits FOR EACH ROW EXECUTE FUNCTION updated();

CREATE TRIGGER handle_updated_trigger BEFORE UPDATE ON public.debits FOR EACH ROW EXECUTE FUNCTION updated();

CREATE TRIGGER handle_updated_trigger BEFORE UPDATE ON public.labels FOR EACH ROW EXECUTE FUNCTION updated();

CREATE TRIGGER handle_updated_trigger BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION updated();

CREATE TRIGGER handle_updated_trigger BEFORE UPDATE ON public.logs FOR EACH ROW EXECUTE FUNCTION updated();

CREATE TRIGGER handle_updated_trigger BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION updated();

CREATE TRIGGER handle_updated_trigger BEFORE UPDATE ON public.permits FOR EACH ROW EXECUTE FUNCTION updated();

CREATE TRIGGER handle_updated_tx_hash BEFORE UPDATE ON public.permits FOR EACH ROW EXECUTE FUNCTION check_null_permit_tx_on_update();

CREATE TRIGGER handle_updated_trigger BEFORE UPDATE ON public.settlements FOR EACH ROW EXECUTE FUNCTION updated();

CREATE TRIGGER handle_updated_trigger BEFORE UPDATE ON public.tokens FOR EACH ROW EXECUTE FUNCTION updated();

CREATE TRIGGER handle_updated_trigger BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION updated();

CREATE TRIGGER handle_updated_trigger BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION updated();


