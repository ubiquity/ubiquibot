import dotenv from "dotenv";
dotenv.config();

import { createAdapters } from "../../..";
import { User } from "./User";
import { Wallet } from "./Wallet";

const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) throw new Error("SUPABASE_URL is not defined");
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_KEY) throw new Error("SUPABASE_KEY is not defined");

const { supabase } = createAdapters({ supabase: { url: SUPABASE_URL, key: SUPABASE_KEY } });

async function test() {
  try {
    const wallet = new Wallet(supabase);
    const address = await wallet.getAddress(4975670 as GitHubUser["id"]);
    console.trace(address);
    const url = await wallet.getWalletRegistrationUrl(4975670 as GitHubUser["id"]);
    console.trace(url);
  } catch (e) {
    console.error(e);
  }
}

void test();

interface GitHubUser {
  login: "pavlovcik";
  id: 4975670;
  node_id: "MDQ6VXNlcjQ5NzU2NzA=";
  avatar_url: "https://avatars.githubusercontent.com/u/4975670?v=4";
  gravatar_id: "";
  url: "https://api.github.com/users/pavlovcik";
  html_url: "https://github.com/pavlovcik";
  followers_url: "https://api.github.com/users/pavlovcik/followers";
  following_url: "https://api.github.com/users/pavlovcik/following{/other_user}";
  gists_url: "https://api.github.com/users/pavlovcik/gists{/gist_id}";
  starred_url: "https://api.github.com/users/pavlovcik/starred{/owner}{/repo}";
  subscriptions_url: "https://api.github.com/users/pavlovcik/subscriptions";
  organizations_url: "https://api.github.com/users/pavlovcik/orgs";
  repos_url: "https://api.github.com/users/pavlovcik/repos";
  events_url: "https://api.github.com/users/pavlovcik/events{/privacy}";
  received_events_url: "https://api.github.com/users/pavlovcik/received_events";
  type: "User";
  site_admin: false;
  name: "アレクサンダー.eth";
  company: "@ubiquity";
  blog: "";
  location: "Mainnet";
  email: null;
  hireable: null;
  bio: "Philomath. \r\nDigital media and technology pioneer.";
  twitter_username: "0x4007";
  public_repos: 32;
  public_gists: 12;
  followers: 47;
  following: 97;
  created_at: "2013-07-09T18:20:01Z";
  updated_at: "2023-10-03T18:27:08Z";
}

interface GitHubComment {
  url: "https://api.github.com/repos/ubiquibot/staging/issues/comments/1746079067";
  html_url: "https://github.com/ubiquibot/staging/issues/186#issuecomment-1746079067";
  issue_url: "https://api.github.com/repos/ubiquibot/staging/issues/186";
  id: 1746079067;
  node_id: "IC_kwDOJkWy-s5oEw1b";
  user: {
    login: "pavlovcik";
    id: 4975670;
    node_id: "MDQ6VXNlcjQ5NzU2NzA=";
    avatar_url: "https://avatars.githubusercontent.com/u/4975670?u=4db74241a75aee8dc48c354d9eee6efdd1a59340&v=4";
    gravatar_id: "";
    url: "https://api.github.com/users/pavlovcik";
    html_url: "https://github.com/pavlovcik";
    followers_url: "https://api.github.com/users/pavlovcik/followers";
    following_url: "https://api.github.com/users/pavlovcik/following{/other_user}";
    gists_url: "https://api.github.com/users/pavlovcik/gists{/gist_id}";
    starred_url: "https://api.github.com/users/pavlovcik/starred{/owner}{/repo}";
    subscriptions_url: "https://api.github.com/users/pavlovcik/subscriptions";
    organizations_url: "https://api.github.com/users/pavlovcik/orgs";
    repos_url: "https://api.github.com/users/pavlovcik/repos";
    events_url: "https://api.github.com/users/pavlovcik/events{/privacy}";
    received_events_url: "https://api.github.com/users/pavlovcik/received_events";
    type: "User";
    site_admin: false;
  };
  created_at: "2023-10-04T03:33:14Z";
  updated_at: "2023-10-04T03:33:14Z";
  author_association: "MEMBER";
  body: "/wallet 0x4007CE2083c7F3E18097aeB3A39bb8eC149a341d";
  reactions: {
    url: "https://api.github.com/repos/ubiquibot/staging/issues/comments/1746079067/reactions";
    total_count: 0;
    "+1": 0;
    "-1": 0;
    laugh: 0;
    hooray: 0;
    confused: 0;
    heart: 0;
    rocket: 0;
    eyes: 0;
  };
  performed_via_github_app: null;
}

/*
{
  node(id: "IC_kwDOJkWy-s5oEw1b") {
    ... on IssueComment {
      author {
        login
      }
      body,
      createdAt
    }
  }
}
*/
/*
{
  node(id: "IC_kwDOJkWy-s5oEw1b") {
    ... on IssueComment {
      url
    }
  }
}
*/
