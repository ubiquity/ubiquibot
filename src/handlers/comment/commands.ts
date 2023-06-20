export enum IssueCommentCommands {
  HELP = "/help", // list available commands
  ASSIGN = "/start", // assign the hunter to the issue automatically
  UNASSIGN = "/stop", // unassign to default
  WALLET = "/wallet", // register wallet address
  PAYOUT = "/payout", // request permit payout
  MULTIPLIER = "/multiplier", // set bounty multiplier (for treasury)

  // Access Controls

  ALLOW = "/allow",
}
