/**
 * The list of repositories to be allowed for permit url generation
 *
 * Why do we need it???
 *
 * The app would work in any forked repositories and generate permi2 url against the main payout account.
 * This is definitely a critical issue in terms of security. In the meantime, we couldn't ask partners (who installed the ubiquibot and uses it)
 * to setup private key even on github secrets.
 * It would be an another security problem to the partners because we can get their private keys on the application.
 *
 * TODO: This is not a great plan but we will keep the payout account safe at least. We should definitely keep improving the feature from time to time.
 */
export const ALLOWED_REPOS_FOR_PERMIT_GENERATION = ["https://github.com/ubiquity/bounty-bot", "https://github.com/Alpha-Labs-Global/blockalizer"];
