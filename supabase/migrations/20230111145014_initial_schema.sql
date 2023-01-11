CREATE TYPE issue_status AS ENUM (
  'READY_TO_START',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE'
);

CREATE TABLE users (
    user_login character varying(255) NOT NULL,
    user_type character varying(255),
    user_name character varying(255) NOT NULL,
    company character varying(255),
    blog text,
    user_location text,
    email text,
    bio text,
    twitter_username text,
    public_repos text,
    followers text,
    contributions text,
    percent_commits integer,
    percent_pull_requests integer,
    percent_issues integer,
    percent_code_reviews integer,
    wallet_address character(42),
    created_at integer,
    updated_at integer
);

CREATE TABLE issues (
    issue_number integer NOT NULL,
    issue_url text NOT NULL,
    comments_url text NOT NULL,
    events_url text NOT NULL,
    labels text[],
    assignees text[],
    status issue_status DEFAULT 'READY_TO_START'::issue_status NOT NULL,
    timeline text,
    priority text,
    price integer,
    txhash text[],
    recipient character(42),
    created_at integer,
    updated_at integer,
);