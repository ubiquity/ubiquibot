export enum IssueCommentCommands {
  HELP = "/help", // list available commands
  START = "/start", // assign the hunter to the issue automatically
  STOP = "/stop", // unassign to default
  WALLET = "/wallet", // register wallet address
  PAYOUT = "/payout", // request permit payout
  MULTIPLIER = "/multiplier", // set task multiplier (for contributor)
  QUERY = "/query",
  ASK = "/ask", // ask GPT a question
  // Access Controls

  ALLOW = "/allow",
  AUTOPAY = "/autopay",
  AUTHORIZE = "/authorize",
}

// see more info at `src/handlers/comment/handlers/index.ts`
