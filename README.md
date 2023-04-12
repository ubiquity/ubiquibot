# `@ubiquity/bounty-bot` the "UbiquiBot"

This bot facilitates the Ubiquity Bounty System.

## Quickstart

```sh
#!/bin/bash

git clone https://github.com/ubiquity/bounty-bot.git
cd bounty-bot
yarn
yarn tsc
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

1. Create a new project at [Supabase](https://supabase.com/)
2. Add Supabase's `Project URL` and `API key` to repository secrets `SUPABASE_URL` and `SUPABASE_KEY`
3. Create a new project at [Memzo](https://app.mezmo.com/)
4. Add Memzo's `Ingestion Key` to repository secrets `LOGDNA_INGESTION_KEY`
5. Add a new github workflow which uses the action(use the latest commit hash):

```
name: Calculate Bounty Based on Issue Labels
on:
  issues:
    types:
      - labeled
      - unlabeled

jobs:
  calculate_bounty_job:
    # ignore events invoked by bots
    if: >-
      github.event.pull_request.payload.sender.type != 'Bot'
    runs-on: ubuntu-latest
    name: Calculate Bounty with UbiquiBot
    steps:
      - name: Ubiquity Bounty Bot
        uses: ubiquity/bounty-bot@c1c6c99336f34ac5e94efaed49c9f218fb7a2d76
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
	  LOGDNA_INGESTION_KEY: ${{ secrets.LOGDNA_INGESTION_KEY }}
          FOLLOWUP_TIME: '4 days'
          DISQUALIFY_TIME: '7 days'

```

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
   - in one instance run `yarn tsc --watch` (compiles the Typescript code)
   - in another instance run `yarn start:watch` (runs the bot locally)
6. Open `localhost:3000` and follow instructions to add the bot to one of your repositories.

At this point the `.env` files auto-fill the empty fields (`PRIVATE_KEY` and `APP_ID`) if it is not previously filled.
Now you can make changes to the repository on GitHub (e.g. add a bounty) and the bot should react.

You can, for example:

1. Create a new issue
2. Add a time label, ex: `Time: <1 Day`
3. At this point the bot should add a price label, you should see event logs in one of your opened terminals

## How it works

Bounty bot is built using the [probot](https://probot.github.io/) framework so initially the bot is a github app. But thanks to the [probot/adapter-github-actions](https://github.com/probot/adapter-github-actions) you can also use the bot as a github action.

You can use the bounty bot in 2 ways: [github action](https://github.com/marketplace/actions/ubiquity-bounty-bot) or [github app](https://github.com/marketplace/ubiquibot).

When using as a github action the flow is the following:

1. Bounty bot is added to a repository as a github action
2. Some event happens in a repository and the bot should react somehow (for example: on adding a time label to an issue the bot should add a price label)
3. Github CI starts a runner (virtual linux machine)
4. Event details are passed to the action directly in the runner
5. The bot handles the event

Using the bounty bot as a github app is mostly useful for development. Github app is simply a server app that receives events from github via webhooks and can somehow react to those events. This way the bot should be deployed somewhere as it is a server app. When using the bot as a github app then the flow is the following:

1. Bounty bot is added to a repository as a github app
2. You run the bot "backend" (for example on your local machine)
3. Some event happens in a repository and the bot should react somehow (for example: on adding a time label to an issue the bot should add a price label)
4. Event details are sent to your deployed bot instance (to a webhook URL that was set in github app's settings)
5. The bot handles the event

## How to create a new release

1. Update the version in package.json: `yarn version --new-version x.x.x`
2. Commit and create a new tag: `git commit -am x.x.x && git tag -am x.x.x`
3. Push tags: `git push origin v"x.x.x"`
4. The Github action will create a release by recognizing the version tag

![ubiquibot-pfp-1](https://user-images.githubusercontent.com/4975670/208798502-0ac27adc-ab19-4148-82b8-8538040cf3b6.png)
