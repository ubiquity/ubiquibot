export enum IssueCommentCommands {
  HELP = "/help", // list available commands
  START = "/start", // assign the hunter to the issue automatically
  STOP = "/stop", // unassign to default
  WALLET = "/wallet", // register wallet address
  PAYOUT = "/payout", // request permit payout
  MULTIPLIER = "/multiplier", // set bounty multiplier (for treasury)
  QUERY = "/query",
  REVIEW = "/review", // gpt-3.5-turbo-16k will review the pull request
  // Access Controls

  ALLOW = "/allow",
  AUTOPAY = "/autopay",
}
