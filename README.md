# The UbiquiBot

Ubiquity DAO's GitHub Bot to automate DevPool management.

## Quickstart

```sh
#!/bin/bash

git clone https://github.com/ubiquity/ubiquibot.git
cd ubiquibot
yarn
yarn build
yarn start:watch
```

## Environment Variables

- Copy `.env.example` to `.env`
- Update `.env` with the following fields:
- `SUPABASE_URL`: Add your Supabase project URL.
- `SUPABASE_KEY`: Add your Supabase project API key.
- `LOGDNA_INGESTION_KEY`: Get it from [Memzo](https://app.mezmo.com/) by creating an account, adding an organization, and copying the ingestion key on the next screen.
- `FOLLOWUP_TIME`: (optional) Set a custom follow-up time (default: 4 days).
- `DISQUALIFY_TIME`: (optional) Set a custom disqualify time (default: 7 days).

`APP_ID` and `PRIVATE_KEY` are [here](https://t.me/c/1588400061/1627) for internal developers to use.
If you are an external developer, `APP_ID`and `PRIVATE_KEY` are automatically generated when you install the app on your repository.

**Note:** When setting up the project, please do not rename the `.env.example` file to `.env` as it will delete the environment example from the repository.
Instead, it is recommended to make a copy of the `.env.example` file and replace the values with the appropriate ones.

## Overview

- This bot is designed to exist as a GitHub Action.
- The code must be compiled using `@vercel/ncc` because all the dependencies (e.g. `node_modules`) must be included and committed on the repository for the GitHub Actions runner to use.

## How to use

1. Go to the [UbiquiBot App Marketplace](https://github.com/marketplace/ubiquibot)
2. Choose a plan and install UbiquiBot on your repository
3. Congratulations! You can now use the UbiquiBot to manage your bounties.

To test the bot, you can:

1. Create a new issue
2. Add a time label, ex: `Time: <1 Day`
3. Add a priority label, ex: `Priority: 0 (Normal)`
4. At this point the bot should add a price label.

## Configuration

`evm-network-id` is ID of the EVM-compatible network that will be used for payouts.

`price-multiplier` is a base number that will be used to calculate bounty price based on the following formula: `price = price-multiplier * time-label-weight * priority-label-weight / 100`

`time-labels` are labels for marking the time limit of the bounty:

- `name` is a human-readable name
- `weight` is a number that will be used to calculate the bounty price
- `value` is number of seconds that corresponds to the time limit of the bounty

`priority-labels` are labels for marking the priority of the bounty:

- `name` is a human-readable name
- `weight` is a number that will be used to calculate the bounty price

`command-settings` are setting to enable or disable a command

- `name` is the name of the command
- `enabled` is a `true` or `false` value to enable or disable a command

`default-labels` are labels that are applied when an issue is created without any time or priority labels.

`assistive-pricing` to create a new pricing label if it doesn't exist. Can be `true` or `false`.

`disable-analytics` can be `true` or `false` that disables or enables weekly analytics collection by Ubiquity.

`payment-permit-max-price` sets the max amount for automatic payout of bounties when the issue is closed

`comment-incentives` can be `true` or `false` that enable or disable comment incentives. These are comments in the issue by either the creator of the bounty or other users.

`issue-creator-multiplier` is a number that defines a base multiplier for calculating incentive for the creator of the issue.

`comment-element-pricing` defines how much is a part of the comment worth. For example `text: 0.1` means that any text in the comment will add 0.1

`max-concurrent-assigns` is the maximum number of bounties that can be assigned to a bounty hunter at once. This excludes bounties with delayed or approved pull request reviews.

`register-wallet-with-verification` can be `true` or `false`. If enabled, it requires a signed message to set wallet address. This prevents users from setting wallet address from centralized exchanges, which would make payments impossible to claim.

`promotion-comment` is a comment that is appended to issue comment when a payment permit is generated.

## How to run locally

1. Create a new project at [Supabase](https://supabase.com/). Add `Project URL` and `API Key` to the `.env` file:

```

SUPABASE_URL="XXX"
SUPABASE_KEY="XXX"

```

2. Create a new organization at [Memzo](https://app.mezmo.com/). Add `LOGDNA_INGESTION_KEY` to the `.env` file:

```

LOGDNA_INGESTION_KEY ="XXX"

```

3. Add `FOLLOW_UP_TIME` and `DISQUALIFY_TIME` to the `.env` file if you don't want to use default ones.

```

FOLLOW_UP_TIME="4 days" // 4 days
DISQUALIFY_TIME="7 days" // 7 days

```

4. `yarn install`
5. Open 2 terminal instances:
   - in one instance run `yarn build --watch` (compiles the Typescript code)
   - in another instance run `yarn start:watch` (runs the bot locally)
6. Open `localhost:3000` and follow instructions to add the bot to one of your repositories.

At this point the `.env` files auto-fill the empty fields (`PRIVATE_KEY` and `APP_ID`) if it is not previously filled.
Now you can make changes to the repository on GitHub (e.g. add a bounty) and the bot should react.

You can, for example:

1. Create a new issue
2. Add a time label, ex: `Time: <1 Day`
3. Add a priority label, ex: `Priority: 0 (Normal)`
4. At this point the bot should add a price label, you should see event logs in one of your opened terminals

## How it works

Bounty bot is built using the [probot](https://probot.github.io/) framework so initially the bot is a github app. But thanks to the [probot/adapter-github-actions](https://github.com/probot/adapter-github-actions) you can also use the bot as a github action.

You can use the bounty bot as a [github app](https://github.com/marketplace/ubiquibot).

When using as a github app the flow is the following:

1. Bounty bot is added to a repository as a github app
2. You run the bot "backend" (for example on your local machine)
3. Some event happens in a repository and the bot should react somehow (for example: on adding a time label to an issue the bot should add a price label)
4. Event details are sent to your deployed bot instance (to a webhook URL that was set in github app's settings)
5. The bot handles the event

## Payments Permits in a local instance

For payment to work in your local instance, ubiquibot must be set up in a Github organization. It will not work for a ubiquibot instance set up in a personal account. Once, you have an ubiquibot instance working in an organization, follow the steps given below:

1. Create a new private repository in your Github organization with name `ubiquibot-config`
2. Add your ubiquibot app to `ubiquibot-config` repository.
3. Create a file `.github/ubiquibot-config.yml` in it. Fill the file with contents from [this file](https://github.com/ubiquity/ubiquibot/blob/development/.github/ubiquibot-config.yml).
4. Go to https://pay.ubq.fi/keygen and generate X25519 public/private key pair. Fill private key of your wallet's address in `PLAIN_TEXT` field and click `Encrypt`.
5. Copy the `CIPHER_TEXT` and append it to your repo `ubiquibot-config/.github/ubiquibot-config.yml` as

   `private-key-encrypted: "PASTE_YOUR_CIPHER_TEXT_HERE"`

6. Copy the `X25519_PRIVATE_KEY` and append it in your local ubiquibot repository `.env` file as

   `X25519_PRIVATE_KEY=PASTE_YOUR_X25519_PRIVATE_KEY_HERE`

## How to QA any additions to the bot

Make sure you have your local instance of ubiquibot running.

1. Fork the ubiquibot repo and add your local instance of ubiquibot to the forked repository.
2. Enable Github action running on the forked repo and allow `issues` on the settings tab.
3. Create a [QA issue](https://github.com/ubiquibot/staging/issues/21) similar to this where you show the feature working in the forked repo
4. Describe carefully the steps taken to get the feature working, this way our team can easily verify
5. Link that QA issue to the pull request as indicated on the template before requesting a review

## How to create a new release

1. Update the version in package.json: `yarn version --new-version x.x.x`
2. Commit and create a new tag: `git commit -am x.x.x && git tag -am x.x.x`
3. Push tags: `git push origin v"x.x.x"`
4. The Github action will create a release by recognizing the version tag

## Architecture Overview

Bounty bot is built using the [probot](https://probot.github.io/) framework so initially the bot is a github app

<pre>
&lt;root&gt;
├── <a href="https://github.com/ubiquity/ubiquibot/tree/development/bin">bin</a>: Binary file and action file compiled by `@vercel/ncc`
├── <a href="https://github.com/ubiquity/ubiquibot/tree/development/docs">docs</a>: Documentations
├── <a href="https://github.com/ubiquity/ubiquibot/tree/development/src">src </a>: Main source code
├── <a href="https://github.com/ubiquity/ubiquibot/tree/development/supabase">supabase</a>: Supabase migrations and configuration file
</pre>

## `/src`

<pre>
&lt;src&gt;
├── <a href="https://github.com/ubiquity/ubiquibot/tree/development/src/adapters">adapters</a>: A set of interaces to interact with 3rd party libraries such as <a href="https://www.npmjs.com/package/telegraf">Telegraf</a>, <a href="https://www.npmjs.com/package/@supabase/supabase-js">supabase-js</a>.<br> It consists of a set of small functions bulit on top of a specific library.<br> Every adapter needs to be for calling a specific method of the library.
|
├── <a href="https://github.com/ubiquity/ubiquibot/tree/development/src/bindings">bindings</a>: A set of listeners to bind/process requests emitted by GitHub.<br> It also has a function to load a project configuration.
|
├── <a href="https://github.com/ubiquity/ubiquibot/tree/development/src/configs">configs</a>: Constants and default config values used to create a bot configuration<br> in case we're missing any needed configuration parameters from both .env and config file.
|
├── <a href="https://github.com/ubiquity/ubiquibot/tree/development/src/handlers">handlers</a>: A set of event-based processors.<br> Each handler processes a specific request and it may consist of pre, action and post handlers.<br> A pre handler would be running in prior to the main action which needs to be shorter not to affect the main handler's process.<br> A post handler would be running as soon as the main handler gets completed. <br>It has no limitation on its completion time.<br> For example, it could be an example of pre-handler to create missing price labels <br> because if we don't have necessary labels created already on the repo, labeling non-exists labels would definitely throw.
|
├── <a href="https://github.com/ubiquity/ubiquibot/tree/development/src/types">types</a> A set of schema and type definitions.<br> Why do we need schema? because we want to validate the unknown input and throw the error before the main execution.
|
├── <a href="https://github.com/ubiquity/ubiquibot/tree/development/src/utils">utils</a> A set of utility functions
</pre>

## Default Config Notes (`ubiquibot-config-default.json`)

We can't use a `jsonc` file due to limitations with Netlify. Here is a snippet of some values with notes next to them.

```jsonc
{
  "payment-permit-max-price": 9007199254740991, // Number.MAX_SAFE_INTEGER
  "max-concurrent-assigns": 9007199254740991, // Number.MAX_SAFE_INTEGER
  "comment-element-pricing": {
    /* https://github.com/syntax-tree/mdast#nodes */
    "strong": 0 // Also includes italics, unfortunately https://github.com/syntax-tree/mdast#strong
    /* https://github.com/syntax-tree/mdast#gfm */

  }
}
```
