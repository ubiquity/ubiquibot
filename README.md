# UbiquiBot

Ubiquity DAO's GitHub Bot for Automating DevPool Management.

## Table of Contents
1. [Quickstart](#quickstart)
2. [Environment Variables](#environment-variables)
3. [Overview](#overview)
4. [How to Use](#how-to-use)
5. [Configuration](#configuration)
6. [How to Run Locally](#how-to-run-locally)
7. [Supabase Database](#supabase-database)
8. [Logs](#logs)
9. [Payments Permits in a Local Instance](#payments-permits-in-a-local-instance)
10. [How to QA Additions to the Bot](#how-to-qa-additions-to-the-bot)
11. [How to Create a New Release](#how-to-create-a-new-release)
12. [Architecture Overview](#architecture-overview)
13. [Default Config Notes (`ubiquibot-config-default.ts`)](#default-config-notes-ubiquibot-config-defaultts)

## Quickstart

```sh
#!/bin/bash

git clone https://github.com/ubiquity/ubiquibot.git
cd ubiquibot
yarn
yarn build (to compile your changes)

yarn build --watch (to locally auto compile your changes)
yarn start:watch
```

## Environment Variables

- Copy `.env.example` to `.env` (do not rename .env.example, just make a copy)
- Update the following fields on `.env`:
- `SUPABASE_URL`: Add your Supabase project URL.
- `SUPABASE_KEY`: Add your Supabase project API key.
- `FOLLOWUP_TIME`: (optional) Set a custom follow-up time (default: 4 days).
- `DISQUALIFY_TIME`: (optional) Set a custom disqualify time (default: 7 days).
- `OPENAI_API_HOST`: (optional) Set OpenAI host url (default: https://api.openai.com).
- `OPENAI_API_KEY`: Set OpenAI key.
- `CHATGPT_USER_PROMPT_FOR_IMPORTANT_WORDS`: (optional) Set a custom user prompt for finding important words 
(default: "I need your help to find important words (e.g. unique adjectives) from github issue below and I want to parse them easily so please separate them using #(No other contexts needed). Please separate the words by # so I can parse them easily. Please answer simply as I only need the important words. Here is the issue content.\n").
- `CHATGPT_USER_PROMPT_FOR_MEASURE_SIMILARITY`: (optional) Set a custom user prompt for measuring similarity 
(default: 'I have two github issues and I need to measure the possibility of the 2 issues are the same content (No other contents needed and give me only the number in %).\n Give me in number format and add % after the number.\nDo not tell other things since I only need the number (e.g. 85%). Here are two issues:\n 1. "%first%"\n2. "%second%"').
- `SIMILARITY_THRESHOLD`: (optional) Set similarity threshold (default: 80).
- `MEASURE_SIMILARITY_AI_TEMPERATURE`: (optional) Set ChatGPT temperature for measuring similarity (default: 0).
- `IMPORTANT_WORDS_AI_TEMPERATURE`: (optional) Set ChatGPT temperature for finding important words (default: 0).
- `WEBHOOK_PROXY_URL`: (required) should be automatically filled when you install Ubiquibot
- `WEBHOOK_SECRET`: (required) should be automatically filled when the app is installed

`APP_ID` and `PRIVATE_KEY` are [here](https://t.me/c/1588400061/1627) for core team developers to use.

If you are an external developer, `APP_ID`and `PRIVATE_KEY` are automatically generated when you install the app on your repository.

Should output:
![setup](https://github.com/ubiquity/ubiquibot/assets/41552663/febf0e61-0402-4b25-838a-a64c1c385984)

You may proceed to go to http://localhost:3000 and you should see

![setup1](https://github.com/ubiquity/ubiquibot/assets/41552663/4b9d7565-8bd4-4e2a-864d-a086fedfe24d)

Click on Register a Github App

![setup3](https://github.com/ubiquity/ubiquibot/assets/41552663/0052feba-e823-419b-acde-d997d68ac553)

Provide the bot a name

![setup3](https://github.com/ubiquity/ubiquibot/assets/41552663/0052feba-e823-419b-acde-d997d68ac553)

![setup4](https://github.com/ubiquity/ubiquibot/assets/41552663/f65e166b-c3fb-4e22-9f49-d622e3922eb7)

Select a handle where to install the bot

Select in which repo the bot shall be available

![setup6](https://github.com/ubiquity/ubiquibot/assets/41552663/dce6b338-abd8-4b54-b990-2cc6cf686d30)

After following the steps you should see

![setup7](https://github.com/ubiquity/ubiquibot/assets/41552663/bbcf0e40-456c-4dd4-93e4-75de87d4d340)

Restart the server for the installation to take efect

![setup10](https://github.com/ubiquity/ubiquibot/assets/41552663/916cc5c3-dfdc-45c7-8d10-65afdce25e29)

After aforemention steps then installation shall be complete

![setup11](https://github.com/ubiquity/ubiquibot/assets/41552663/0e88fec0-fa8b-4d34-8cc8-024c99b5b640)

## Seeing this page below after hitting http://localhost:3000 again?

![trylocal](https://github.com/ubiquity/ubiquibot/assets/41552663/e958e7e4-6d42-44d1-a5cf-a090911f062c)

### Congratulations! you successfully installed Ubiquibot (new or to an existing app)



**Note:** When setting up the project, please do not rename the `.env.example` file to `.env` as it will delete the environment example from the repository.
Instead, it is recommended to make a copy of the `.env.example` file and replace the values with the appropriate ones.

## Overview

- This bot is available as a GitHub Action.
- The code must be compiled using `@vercel/ncc` because all the dependencies (e.g. `node_modules`) must be included and committed on the repository for the GitHub Actions runner to use.

## How to use

1. Go to the [UbiquiBot App Marketplace](https://github.com/marketplace/ubiquibot)
2. Choose a plan and install UbiquiBot on your repository
3. Congratulations! You can now use the UbiquiBot to manage your bounties.

To test the bot, you can:

1. Create a new issue
2. Add a time label, ex: `Time: <1 Day`
3. Add a priority label, ex: `Priority: 1 (Normal)`
4. At this point the bot should add a price label.

## Configuration

`evmNetworkId` is ID of the EVM-compatible network that will be used for payouts.

`priceMultiplier` is a base number that will be used to calculate bounty price based on the following formula: `price = priceMultiplier * timeLabelWeight * priority-label-weight * 100`

`timeLabels` are labels for marking the time limit of the bounty:

- `name` is a human-readable name
- `value` is number of seconds that corresponds to the time limit of the bounty

`priorityLabels` are labels for marking the priority of the bounty:

- `name` is a human-readable name

`commandSettings` are setting to enable or disable a command

- `name` is the name of the command
- `enabled` is a `true` or `false` value to enable or disable a command

`defaultLabels` are labels that are applied when an issue is created without any time or priority labels.

`assistivePricing` to create a new pricing label if it doesn't exist. Can be `true` or `false`.

`disableAnalytics` can be `true` or `false` that disables or enables weekly analytics collection by Ubiquity.

`paymentPermitMaxPrice` sets the max amount for automatic payout of bounties when the issue is closed.

`commentIncentives` can be `true` or `false` that enable or disable comment incentives. These are payments generated for comments in the issue by contributors, excluding the assignee.

`issueCreatorMultiplier` is a number that defines a base multiplier for calculating incentive for the creator of the issue.

`comment-element-pricing` defines how much is a part of the comment worth. For example `text: 0.1` means that any text in the comment will add 0.1

`incentives` defines incentive rewards:

- `comment` defines comment rewards:
  - `elements` defines reward value for HTML elements such as `p`, `img`, `a`.
  - `totals`:
    - `word` defines reward for each word in the comment

`maxConcurrentAssigns` is the maximum number of bounties that can be assigned to a bounty hunter at once. This excludes bounties with delayed or approved pull request reviews.

`registerWalletWithVerification` can be `true` or `false`. If enabled, it requires a signed message to set wallet address. This prevents users from setting wallet address from centralized exchanges, which would make payments impossible to claim.

`promotionComment` is a message that is appended to the payment permit comment.

## How to run locally

### Supase Database

### Option 1

1. Create a new project at [Supabase](https://supabase.com/). Add `Project URL` and `API Key` to the `.env` file:

```

SUPABASE_URL="XXX"
SUPABASE_KEY="XXX"

```

### Option 2

Supabase comes with a [readme](https://github.com/ubiquity/ubiquibot/blob/development/supabase/README.md) which is helpful for managing and setup
### This options will require you to have a local Docker installation (under the hood it is required by Supabase) refer to [Supabase Docs](https://supabase.com/docs)

```
yarn supabase start
```

## Check Supabase Status (locally)
```
yarn supabase status
```

![supabase](https://github.com/ubiquity/ubiquibot/assets/41552663/e8709b8f-e7c3-49e0-876c-c15dde22c6d2)

## Supabase Studio

You can then access to Supabase Studio by going to http://localhost:54323


2. Add `FOLLOW_UP_TIME` and `DISQUALIFY_TIME` to the `.env` file if you don't want to use default ones.

```

FOLLOW_UP_TIME="4 days" // 4 days
DISQUALIFY_TIME="7 days" // 7 days

```

3. `Make sure you have Node => 20 && yarn`
4. Open 2 terminal instances:
   - in one instance run `yarn build --watch` (compiles the Typescript code)
   - in another instance run `yarn start:watch` (runs the bot locally)
5. Open `http://localhost:3000` and follow instructions to add the bot to one of your repositories.

At this point the `.env` files auto-fill the empty fields (`PRIVATE_KEY` and `APP_ID`) if it is not previously filled.
Now you can make changes to the repository on GitHub (e.g. add a bounty) and the bot should react.

6. After adding the bot (as a installed app) to your github you will need to restart the aforemention yarn start:watch so CTRL-C to stop the node daemon and `yarn start:watch` again

You can, for example:

1. Create a new issue
2. Add a time label, ex: `Time: <1 Day`
3. Add a priority label, ex: `Priority: 1 (Normal)`
4. the bot should add a price label, you should see event logs in your opened bot terminals

## How it works

Ubiquibot is built using the [probot](https://probot.github.io/) framework so in fact the bot is a github app. But thanks to the [probot/adapter-github-actions](https://github.com/probot/adapter-github-actions) you can also use the bot as a github action.

[Ubiquibot](https://github.com/marketplace/ubiquibot) it's also available ready to install on the Githut Marketplace.

When using as a github app the flow is the following:

1. UbiquiBot is added to a repository as a github app
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

Make sure you have your local instance of [ubiquibot running](#quickstart).

1. Fork the ubiquibot repo and add your local instance of ubiquibot to the forked repository.
2. Enable Github action running on the forked repo and allow `issues` on the settings tab.
3. Create a [QA issue](https://github.com/ubiquibot/staging/issues/21) similar to this where you show the feature working in the forked repo.
4. Describe carefully the steps taken to get the feature working, this way our team can easily verify.
5. Link that QA issue to the pull request as indicated on the template before requesting a review.

## How to create a new release

1. Update the version in package.json: `yarn version --new-version x.x.x`
2. Commit and create a new tag: `git commit -am x.x.x && git tag -am x.x.x`
3. Push tags: `git push origin v"x.x.x"`
4. The Github action will create a release by recognizing the version tag

## Architecture Overview

Ubiquibot is built using the [probot](https://probot.github.io/) framework, the bot is a github app

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

├── <a href="https://github.com/ubiquity/ubiquibot/tree/development/src/helpers">helpers</a> A set of schema and type definitions.<br> Why do we need schema? because we want to validate the unknown input and throw the error before the main execution.

├── <a href="https://github.com/ubiquity/ubiquibot/tree/development/src/utils">utils</a> A set of utility functions
</pre>

## Default Config Notes (`ubiquibot-config-default.ts`)

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

## Supabase Cron Job (`logs-cleaner`)

##### Dashboard > Project > Database > Extensions

> Search `PG_CRON` and Enable it.


##### Dashboard > Project > SQL Editor

```sql
-- Runs everyday at 03:00 AM to cleanup logs that are older than a week
-- Use the cron time format to modify the trigger time if necessary
select
  cron.schedule (
    'logs-cleaner', -- Job name
    '0 3 * * *', -- Everyday at 03:00 AM
    $$DELETE FROM logs WHERE timestamp < now() - INTERVAL '1 week'$$
  );


-- Cancel the cron job
select cron.unschedule('logs-cleaner');
```
