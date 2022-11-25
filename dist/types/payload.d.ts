import { Static } from "@sinclair/typebox";
export declare enum Action {
    REQUESTED = "requested",
    REVIEW_REQUESTED = "review_requested",
    REVIEW_REQUEST_REMOVED = "review_request_removed",
    COMPLETED = "completed",
    REREQUESTED = "rerequested",
    ASSIGNED = "assigned",
    CLOSED = "closed",
    CREATED = "created",
    DELETED = "deleted",
    MILESTONED = "milestoned",
    DEMILESTONED = "demilestoned",
    EDITED = "edited",
    LABELED = "labeled",
    LOCKED = "locked",
    OPENED = "opened",
    PINNED = "pinned",
    REOPENED = "reopened",
    TRANSFERRED = "transferred",
    UNASSIGNED = "unassigned",
    UNLABELED = "unlabeled",
    UNLOCKED = "unlocked",
    UNPINNED = "unpinned"
}
export declare enum UserType {
    User = "User",
    Bot = "Bot",
    Organization = "Organization"
}
export declare const PayloadSchema: import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TEnum<typeof Action>;
    issue: import("@sinclair/typebox").TObject<{
        url: import("@sinclair/typebox").TString<"ipv4">;
        repository_url: import("@sinclair/typebox").TString<"ipv4">;
        labels_url: import("@sinclair/typebox").TString<"ipv4">;
        comments_url: import("@sinclair/typebox").TString<"ipv4">;
        events_url: import("@sinclair/typebox").TString<"ipv4">;
        html_url: import("@sinclair/typebox").TString<"ipv4">;
        id: import("@sinclair/typebox").TNumber;
        node_id: import("@sinclair/typebox").TString<string>;
        number: import("@sinclair/typebox").TNumber;
        title: import("@sinclair/typebox").TString<string>;
        user: import("@sinclair/typebox").TObject<{
            login: import("@sinclair/typebox").TString<string>;
            id: import("@sinclair/typebox").TNumber;
            node_id: import("@sinclair/typebox").TString<string>;
            avatar_url: import("@sinclair/typebox").TString<"ipv4">;
            gravatar_id: import("@sinclair/typebox").TString<string>;
            url: import("@sinclair/typebox").TString<"ipv4">;
            html_url: import("@sinclair/typebox").TString<"ipv4">;
            followers_url: import("@sinclair/typebox").TString<"ipv4">;
            following_url: import("@sinclair/typebox").TString<"ipv4">;
            gists_url: import("@sinclair/typebox").TString<"ipv4">;
            starred_url: import("@sinclair/typebox").TString<"ipv4">;
            subscriptions_url: import("@sinclair/typebox").TString<"ipv4">;
            organizations_url: import("@sinclair/typebox").TString<"ipv4">;
            repos_url: import("@sinclair/typebox").TString<"ipv4">;
            events_url: import("@sinclair/typebox").TString<"ipv4">;
            received_events_url: import("@sinclair/typebox").TString<"ipv4">;
            type: import("@sinclair/typebox").TEnum<typeof UserType>;
            site_admin: import("@sinclair/typebox").TBoolean;
        }>;
        labels: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TNumber;
            node_id: import("@sinclair/typebox").TString<string>;
            url: import("@sinclair/typebox").TString<"ipv4">;
            name: import("@sinclair/typebox").TString<string>;
            color: import("@sinclair/typebox").TString<string>;
            default: import("@sinclair/typebox").TBoolean;
            description: import("@sinclair/typebox").TString<string>;
        }>>;
        state: import("@sinclair/typebox").TString<string>;
        locked: import("@sinclair/typebox").TBoolean;
        assignee: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString<string>>;
        assignees: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString<string>>;
        comments: import("@sinclair/typebox").TNumber;
        created_at: import("@sinclair/typebox").TString<"date-time">;
        updated_at: import("@sinclair/typebox").TString<"date-time">;
        closed_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString<"date-time">>;
        author_association: import("@sinclair/typebox").TString<string>;
        reactions: import("@sinclair/typebox").TObject<{
            url: import("@sinclair/typebox").TString<"ipv4">;
            total_count: import("@sinclair/typebox").TNumber;
            "+1": import("@sinclair/typebox").TNumber;
            "-1": import("@sinclair/typebox").TNumber;
            laugh: import("@sinclair/typebox").TNumber;
            hooray: import("@sinclair/typebox").TNumber;
            confused: import("@sinclair/typebox").TNumber;
            heart: import("@sinclair/typebox").TNumber;
            rocket: import("@sinclair/typebox").TNumber;
            eyes: import("@sinclair/typebox").TNumber;
        }>;
        timeline_url: import("@sinclair/typebox").TString<"ipv4">;
    }>;
    label: import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TNumber;
        node_id: import("@sinclair/typebox").TString<string>;
        url: import("@sinclair/typebox").TString<"ipv4">;
        name: import("@sinclair/typebox").TString<string>;
        color: import("@sinclair/typebox").TString<string>;
        default: import("@sinclair/typebox").TBoolean;
        description: import("@sinclair/typebox").TString<string>;
    }>;
    sender: import("@sinclair/typebox").TObject<{
        login: import("@sinclair/typebox").TString<string>;
        id: import("@sinclair/typebox").TNumber;
        node_id: import("@sinclair/typebox").TString<string>;
        avatar_url: import("@sinclair/typebox").TString<"ipv4">;
        gravatar_id: import("@sinclair/typebox").TString<string>;
        url: import("@sinclair/typebox").TString<"ipv4">;
        html_url: import("@sinclair/typebox").TString<"ipv4">;
        followers_url: import("@sinclair/typebox").TString<"ipv4">;
        following_url: import("@sinclair/typebox").TString<"ipv4">;
        gists_url: import("@sinclair/typebox").TString<"ipv4">;
        starred_url: import("@sinclair/typebox").TString<"ipv4">;
        subscriptions_url: import("@sinclair/typebox").TString<"ipv4">;
        organizations_url: import("@sinclair/typebox").TString<"ipv4">;
        repos_url: import("@sinclair/typebox").TString<"ipv4">;
        events_url: import("@sinclair/typebox").TString<"ipv4">;
        received_events_url: import("@sinclair/typebox").TString<"ipv4">;
        type: import("@sinclair/typebox").TEnum<typeof UserType>;
        site_admin: import("@sinclair/typebox").TBoolean;
    }>;
    repository: import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TNumber;
        node_id: import("@sinclair/typebox").TString<string>;
        name: import("@sinclair/typebox").TString<string>;
        full_name: import("@sinclair/typebox").TString<string>;
        private: import("@sinclair/typebox").TBoolean;
        owner: import("@sinclair/typebox").TObject<{
            login: import("@sinclair/typebox").TString<string>;
            id: import("@sinclair/typebox").TNumber;
            node_id: import("@sinclair/typebox").TString<string>;
            avatar_url: import("@sinclair/typebox").TString<"ipv4">;
            gravatar_id: import("@sinclair/typebox").TString<string>;
            url: import("@sinclair/typebox").TString<"ipv4">;
            html_url: import("@sinclair/typebox").TString<"ipv4">;
            followers_url: import("@sinclair/typebox").TString<"ipv4">;
            following_url: import("@sinclair/typebox").TString<"ipv4">;
            gists_url: import("@sinclair/typebox").TString<"ipv4">;
            starred_url: import("@sinclair/typebox").TString<"ipv4">;
            subscriptions_url: import("@sinclair/typebox").TString<"ipv4">;
            organizations_url: import("@sinclair/typebox").TString<"ipv4">;
            repos_url: import("@sinclair/typebox").TString<"ipv4">;
            events_url: import("@sinclair/typebox").TString<"ipv4">;
            received_events_url: import("@sinclair/typebox").TString<"ipv4">;
            type: import("@sinclair/typebox").TEnum<typeof UserType>;
            site_admin: import("@sinclair/typebox").TBoolean;
        }>;
        html_url: import("@sinclair/typebox").TString<"ipv4">;
        description: import("@sinclair/typebox").TString<string>;
        fork: import("@sinclair/typebox").TBoolean;
        url: import("@sinclair/typebox").TString<"ipv4">;
        forks_url: import("@sinclair/typebox").TString<"ipv4">;
        keys_url: import("@sinclair/typebox").TString<"ipv4">;
        collaborators_url: import("@sinclair/typebox").TString<"ipv4">;
        teams_url: import("@sinclair/typebox").TString<"ipv4">;
        hooks_url: import("@sinclair/typebox").TString<"ipv4">;
        issue_events_url: import("@sinclair/typebox").TString<"ipv4">;
        events_url: import("@sinclair/typebox").TString<"ipv4">;
        assignees_url: import("@sinclair/typebox").TString<"ipv4">;
        branches_url: import("@sinclair/typebox").TString<"ipv4">;
        tags_url: import("@sinclair/typebox").TString<"ipv4">;
        blobs_url: import("@sinclair/typebox").TString<"ipv4">;
        git_tags_url: import("@sinclair/typebox").TString<"ipv4">;
        git_refs_url: import("@sinclair/typebox").TString<"ipv4">;
        trees_url: import("@sinclair/typebox").TString<"ipv4">;
        statuses_url: import("@sinclair/typebox").TString<"ipv4">;
        languages_url: import("@sinclair/typebox").TString<"ipv4">;
        stargazers_url: import("@sinclair/typebox").TString<"ipv4">;
        contributors_url: import("@sinclair/typebox").TString<"ipv4">;
        subscribers_url: import("@sinclair/typebox").TString<"ipv4">;
        subscription_url: import("@sinclair/typebox").TString<"ipv4">;
        commits_url: import("@sinclair/typebox").TString<"ipv4">;
        git_commits_url: import("@sinclair/typebox").TString<"ipv4">;
        comments_url: import("@sinclair/typebox").TString<"ipv4">;
        issue_comment_url: import("@sinclair/typebox").TString<"ipv4">;
        contents_url: import("@sinclair/typebox").TString<"ipv4">;
        compare_url: import("@sinclair/typebox").TString<"ipv4">;
        merges_url: import("@sinclair/typebox").TString<"ipv4">;
        archive_url: import("@sinclair/typebox").TString<"ipv4">;
        downloads_url: import("@sinclair/typebox").TString<"ipv4">;
        issues_url: import("@sinclair/typebox").TString<"ipv4">;
        pulls_url: import("@sinclair/typebox").TString<"ipv4">;
        milestones_url: import("@sinclair/typebox").TString<"ipv4">;
        notifications_url: import("@sinclair/typebox").TString<"ipv4">;
        labels_url: import("@sinclair/typebox").TString<"ipv4">;
        releases_url: import("@sinclair/typebox").TString<"ipv4">;
        deployments_url: import("@sinclair/typebox").TString<"ipv4">;
        created_at: import("@sinclair/typebox").TString<"date-time">;
        updated_at: import("@sinclair/typebox").TString<"date-time">;
        pushed_at: import("@sinclair/typebox").TString<"date-time">;
        git_url: import("@sinclair/typebox").TString<"ipv4">;
        ssh_url: import("@sinclair/typebox").TString<string>;
        clone_url: import("@sinclair/typebox").TString<"ipv4">;
        svn_url: import("@sinclair/typebox").TString<"ipv4">;
        size: import("@sinclair/typebox").TNumber;
        stargazers_count: import("@sinclair/typebox").TNumber;
        watchers_count: import("@sinclair/typebox").TNumber;
        language: import("@sinclair/typebox").TString<string>;
        has_issues: import("@sinclair/typebox").TBoolean;
        has_projects: import("@sinclair/typebox").TBoolean;
        has_downloads: import("@sinclair/typebox").TBoolean;
        has_wiki: import("@sinclair/typebox").TBoolean;
        has_pages: import("@sinclair/typebox").TBoolean;
        forks_count: import("@sinclair/typebox").TNumber;
        archived: import("@sinclair/typebox").TBoolean;
        disabled: import("@sinclair/typebox").TBoolean;
        open_issues_count: import("@sinclair/typebox").TNumber;
        license: import("@sinclair/typebox").TObject<{
            key: import("@sinclair/typebox").TString<string>;
            name: import("@sinclair/typebox").TString<string>;
            spdx_id: import("@sinclair/typebox").TString<string>;
            url: import("@sinclair/typebox").TString<"ipv4">;
            node_id: import("@sinclair/typebox").TString<string>;
        }>;
        allow_forking: import("@sinclair/typebox").TBoolean;
        is_template: import("@sinclair/typebox").TBoolean;
        web_commit_signoff_required: import("@sinclair/typebox").TBoolean;
        topics: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TAny>;
        visibility: import("@sinclair/typebox").TString<string>;
        forks: import("@sinclair/typebox").TNumber;
        open_issues: import("@sinclair/typebox").TNumber;
        watchers: import("@sinclair/typebox").TNumber;
        default_branch: import("@sinclair/typebox").TString<string>;
    }>;
    organization: import("@sinclair/typebox").TObject<{
        login: import("@sinclair/typebox").TString<string>;
        id: import("@sinclair/typebox").TNumber;
        node_id: import("@sinclair/typebox").TString<string>;
        url: import("@sinclair/typebox").TString<"ipv4">;
        repos_url: import("@sinclair/typebox").TString<"ipv4">;
        events_url: import("@sinclair/typebox").TString<"ipv4">;
        hooks_url: import("@sinclair/typebox").TString<"ipv4">;
        issues_url: import("@sinclair/typebox").TString<"ipv4">;
        members_url: import("@sinclair/typebox").TString<"ipv4">;
        public_members_url: import("@sinclair/typebox").TString<"ipv4">;
        avatar_url: import("@sinclair/typebox").TString<"ipv4">;
        description: import("@sinclair/typebox").TString<string>;
    }>;
    installation: import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TNumber;
        node_id: import("@sinclair/typebox").TString<string>;
    }>;
}>;
export type Payload = Static<typeof PayloadSchema>;
