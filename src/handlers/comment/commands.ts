export enum IssueCommentCommands {
  HELP = "/help", // list available commands
  START = "/start", // assign the hunter to the issue automatically
  STOP = "/stop", // unassign to default
  WALLET = "/wallet", // register wallet address
  PAYOUT = "/payout", // request permit payout
  MULTIPLIER = "/multiplier", // set bounty multiplier (for treasury)
  QUERY = "/query",
  ASK = "/ask", // ask GPT a question
  INCENTIVIZE = "/incentivize",
  // Access Controls

  ALLOW = "/allow",
  AUTOPAY = "/autopay",
  AUTHORIZE = "/authorize",
}
