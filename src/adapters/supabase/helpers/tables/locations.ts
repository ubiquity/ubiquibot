import { SupabaseClient } from "@supabase/supabase-js";
import { Super } from "./super";

// currently trying to save all of the location metadata of the event.
// seems that focusing on the IssueComments will provide the most value

export class Locations extends Super {
  locationResponse: LocationResponse | undefined;

  user_id: string | undefined;
  comment_id: string | undefined;
  issue_id: string | undefined;
  repository_id: string | undefined;
  node_id: string | undefined;
  node_type: string | undefined;

  constructor(supabase: SupabaseClient) {
    super(supabase);
  }
  public async setLocations(issueCommentId: string) {
    const graphQlQuery = `
    query {
        node(id: "${issueCommentId}") {
          ... on IssueComment {
            id
            author {
              login
              ... on User {
                id
              }
            }
            issue {
              id
              number
              repository {
                id
                name
                owner {
                  ... on Organization {
                    id
                    login
                  }
                }
              }
            }
          }
        }
      }
    `;

    this.locationResponse = (await this.runtime.eventContext.octokit.graphql(graphQlQuery)) as LocationResponse;
    console.trace(this.locationResponse);

    this.user_id = this.locationResponse.data.node.author.id;
    this.comment_id = this.locationResponse.data.node.id;
    this.issue_id = this.locationResponse.data.node.issue.id;
    this.repository_id = this.locationResponse.data.node.issue.repository.id;
    this.node_id = this.locationResponse.data.node.issue.repository.id;
    this.node_type = "IssueComment";

    return this.locationResponse;
  }
}

interface LocationResponse {
  data: {
    node: {
      id: "IC_kwDOH92Z-c5oA5cs";
      author: {
        login: "molecula451";
        id: "MDQ6VXNlcjQxNTUyNjYz";
      };
      issue: {
        id: "I_kwDOH92Z-c5yRpyq";
        number: 846;
        repository: {
          id: "R_kgDOH92Z-Q";
          name: "ubiquibot";
          owner: {
            id: "MDEyOk9yZ2FuaXphdGlvbjc2NDEyNzE3";
            login: "ubiquity";
          };
        };
      };
    };
  };
}
