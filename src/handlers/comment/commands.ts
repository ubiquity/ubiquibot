export enum IssueCommentCommands {
  HELP = "/help", // list available commands
  ASSIGN = "/assign", // assign the hunter to the issue automatically
  UNASSIGN = "/unassign", // unassign to default
  WALLET = "/wallet", // register wallet address
  PAYOUT = "/payout", // request permit payout
  MULTIPLIER = "/multiplier", // set bounty multiplier (for treasury) can add reason by leaving a space and typing it syntax /multiplier @draeieg 0.5 core contributor on payroll

  // Access Controls

  ALLOW = "/allow",
}
