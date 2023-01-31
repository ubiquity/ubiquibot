# `@ubiquity/bounty-bot` the "UbiquiBot"

This bot facilitates the Ubiquity Bounty System.

## Overview

- This bot is designed to exist as a GitHub Action.
- The code must be compiled using `@vercel/ncc` because all the dependencies (e.g. `node_modules`) must be included and committed on the repository for the GitHub Actions runner to use.

## How to use
1. Create a new project at [Supabase](https://supabase.com/)
2. Add Supabase's `Project URL` and `API key` to repository secrets `SUPABASE_PROJECT_URL` and `SUPABASE_PROJECT_KEY`
3. Add a new github workflow which uses the action(use the latest commit hash): 
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
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SUPABASE_PROJECT_URL: ${{ secrets.SUPABASE_PROJECT_URL }}
          SUPABASE_PROJECT_KEY: ${{ secrets.SUPABASE_PROJECT_KEY }}

```

## How to run locally
1. `yarn install`
2. Open 2 terminal instances:
    - in one instance run `./node_modules/.bin/tsc --watch` (compiles the Typescript code)
    - in another instance run `yarn start:local:watch` (runs the bot locally)
3. Open `localhost:3000` and follow instructions to add the bot to one of your repositories.
4. Create a new project at [Supabase](https://supabase.com/). Add `Project URL` and `API key` to the `.env` file:
```
SUPABASE_PROJECT_URL=XXX
SUPABASE_PROJECT_KEY=XXX
```

At this point you can make changes to the repository on GitHub (e.g. add a bounty) and the bot should react. You can, for example:
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
3. Push tags: `git push origin <tag>`
4. The Github action will create a release by recognizing the version tag


![ubiquibot-pfp-1](https://user-images.githubusercontent.com/4975670/208798502-0ac27adc-ab19-4148-82b8-8538040cf3b6.png)
