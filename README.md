# `@ubiquity/bounty-bot` the "UbiquiBot"

This bot facilitates the Ubiquity Bounty System.

## Overview

- This bot is designed to exist as a GitHub Action.
- The code must be compiled using `@vercel/ncc` because all the dependencies (e.g. `node_modules`) must be included and committed on the repository for the GitHub Actions runner to use.

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

![ubiquibot-pfp-1](https://user-images.githubusercontent.com/4975670/208798502-0ac27adc-ab19-4148-82b8-8538040cf3b6.png)
