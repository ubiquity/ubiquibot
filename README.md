# `@ubiquity/bounty-bot` the "UbiquiBot"

> This bot facilitates the Ubiquity Bounty System.

## Overview

- This bot is designed to exist as a GitHub Action.
- Because of this, the code must be compiled and commited to the repository for the GitHub Action to run the JavaScript.
- The code must be compiled using `@vercel/ncc` because all the dependencies (e.g. `node_modules`) must be included.
