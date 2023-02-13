# Architecture Overview

Bounty bot is built using the [probot](https://probot.github.io/) framework so initially the bot is a github app

<pre>
&lt;root&gt;
├── <a href="https://github.com/ubiquity/bounty-bot/tree/development/bin">bin</a>: Binary file and action file compiled by `@vercel/ncc`
├── <a href="https://github.com/ubiquity/bounty-bot/tree/development/docs">docs</a>: Documentations
├── <a href="https://github.com/ubiquity/bounty-bot/tree/development/src">src </a>: Main source code
├── <a href="https://github.com/ubiquity/bounty-bot/tree/development/supabase">supabase</a>: Supabase migrations and configuration file
</pre>


## `/src`
<pre>
&lt;src&gt;
├── <a href="https://github.com/ubiquity/bounty-bot/tree/development/src/adapters">adapters</a>: A set of interaces to interact with 3rd party libraries such as <a href="https://www.npmjs.com/package/telegraf">Telegraf</a>, <a href="https://www.npmjs.com/package/@supabase/supabase-js">supabase-js</a>.<br> It consists of a set of small functions bulit on top of a specific library.<br> Every adapter needs to be for calling a specific method of the library.
|
├── <a href="https://github.com/ubiquity/bounty-bot/tree/development/src/bindings">bindings</a>: A set of listeners to bind/process requests emitted by GitHub.<br> It also has a function to load a project configuration. 
| 
├── <a href="https://github.com/ubiquity/bounty-bot/tree/development/src/configs">configs</a>: Constants and default config values used to create a bot configuration<br> in case we're missing any needed configuration parameters from both .env and config file.
|
├── <a href="https://github.com/ubiquity/bounty-bot/tree/development/src/handlers">handlers</a>: A set of event-based processors.<br> Each handler processes a specific request and it may consist of pre, action and post handlers.<br> A pre handler would be running in prior to the main action which needs to be shorter not to affect the main handler's process.<br> A post handler would be running as soon as the main handler gets completed. <br>It has no limitation on its completion time.<br> For example, it could be an example of pre-handler to create missing price labels <br> because if we don't have necessary labels created already on the repo, labeling non-exists labels would definitely throw.
| 
├── <a href="https://github.com/ubiquity/bounty-bot/tree/development/src/types">types</a> A set of schema and type definitions.<br> Why do we need schema? because we want to validate the unknown input and throw the error before the main execution. 
| 
├── <a href="https://github.com/ubiquity/bounty-bot/tree/development/src/utils">utils</a> A set of utility functions
</pre>
