# Documentation for App Deploy

## 1.Register your Github App

- Go to https://github.com/settings/apps/new
- Homepage URL: the URL to the GitHub repository for your app
- Webhook URL: Use https://example.com/ for now, we'll come back in a minute to update this with the URL of your deployed app.
- Webhook Secret: Generate a unique secret with (e.g. with openssl rand -base64 32) and save it because you'll need it in a minute to configure your Probot app.
- Permissions: was not sure lol - so have set all of them `Access: Read/Write`
- Subscribe to events: `Issues, Issue comment, Label, Pull request, PR review, PR review comment, PR review thread, Push, Repository dispatch, Workflow dispatch, Workflow run`
- Create your App and install to your repository (the one you want to install)

## 2. Deploy the app

- Go to netlify and select the github repository (ubiquibot) and select the branch you want to deploy
- Set environment variables:
  - APP_ID: the id of the app which is created just before (You can get it from app settings https://github.com/settings/apps/your_app_name)
  - GITHUB_CLIENT_ID: also the one appear in app settings
  - GITHUB_CLIENT_SECRET: you can generate the secret in app settings page
  - GITHUB_TOKEN: your PAT token for the config repo which includes compute delegating
  - PRIVATE_KEY: Scroll down in app settings page and generate private key and paste it
  - SUPABASE_KEY: your SUPABASE key
  - SUPABASE_URL: your SUPABASE url
  - WEBHOOK_PROXY_URL: the proxy url in your '.env' file already
  - WEBHOOK_SECRET: the env variable in your .env file (also set this value as webhook secret in webhook section in app settings page)
  - X25519_PRIVATE_KEY: your X25519_PRIVATE_KEY
- Then deploy your app
- In app settings page, set your Webhook URL as `deployed_url/.netlify/functions/webhooks`
- you can see the logs at `app.netlify.com/sites/deployed_url/logs/functions/webhooks`
