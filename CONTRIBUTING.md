## Contributing

We're thrilled that you'd like to contribute to this project. Your help is essential for keeping it great.

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Issues and PRs

If you have suggestions for how this project could be improved, or want to report a bug, open an issue! We'd love all and any contributions. If you have questions, too, we'd love to hear them.

We'd also love PRs. If you're thinking of a large PR, we advise opening up an issue first to talk about it.

## Submitting a pull request

1. Fork and clone the repository.
2. Configure and install the dependencies: `bun install`.
3. Make sure the tests pass on your machine: `bun test`. These tests also apply the linter, so there's no need to lint separately.
4. Create a new branch: `git checkout -b my-branch-name`.
5. Make your change, add tests, and make sure the tests still pass. You can find the tests in the `src/tests` directory.
6. Push to your fork and submit a pull request.
7. Wait for your pull request to be reviewed and merged.

Here are a few things you can do that will increase the likelihood of your pull request being accepted:

- Write and update tests. You can find examples of how to do this in the `src/tests` directory.
- Keep your changes as focused as possible. If there are multiple changes you would like to make that are not dependent upon each other, consider submitting them as separate pull requests.
- Write a good commit message that conforms to (conventional commits)[https://www.conventionalcommits.org/]. This makes it easier to understand what your code is doing and why, which makes reviewing and maintaining it easier.

Work in Progress pull requests are also welcome to get feedback early on, or if there is something blocked you.

## Running the project locally

1. Fork and clone the repository.
2. Install dependencies: `bun install`.
3. Build the project: `bun tsc`.
4. Start the project: `bun start:watch`.

## Environment Setup

Copy `.env.example` to `.env` and update the fields with your own information. For more details, refer to the [Environment Setup](README.md#Environment-Setup) section in the README.

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)