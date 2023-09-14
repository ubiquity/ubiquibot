import { MergedConfig } from './src/types/config'

const DefaultConfig : MergedConfig = {
  "evm-network-id": 100,
  "price-multiplier": 1,
  "issue-creator-multiplier": 2,
  "payment-permit-max-price": 9007199254740991,
  "max-concurrent-assigns": 9007199254740991,
  "assistive-pricing": false,
  "disable-analytics": false,
  "comment-incentives": false,
  "register-wallet-with-verification": false,
  "promotion-comment": "\n<h6>If you enjoy the DevPool experience, please follow <a href='https://github.com/ubiquity'>Ubiquity on GitHub</a> and star <a href='https://github.com/ubiquity/devpool-directory'>this repo</a> to show your support. It helps a lot!</h6>",
  "default-labels": [],
  "time-labels": [
    {
      "name": "Time: <1 Hour"
    },
    {
      "name": "Time: <1 Day"
    },
    {
      "name": "Time: <1 Week"
    },
    {
      "name": "Time: <2 Weeks"
    },
    {
      "name": "Time: <1 Month"
    }
  ],
  "priority-labels": [
    {
      "name": "Priority: 1 (Normal)"
    },
    {
      "name": "Priority: 2 (Medium)"
    },
    {
      "name": "Priority: 3 (High)"
    },
    {
      "name": "Priority: 4 (Urgent)"
    },
    {
      "name": "Priority: 5 (Emergency)"
    }
  ],
  "command-settings": [
    {
      "name": "start",
      "enabled": false
    },
    {
      "name": "stop",
      "enabled": false
    },
    {
      "name": "wallet",
      "enabled": false
    },
    {
      "name": "payout",
      "enabled": false
    },
    {
      "name": "multiplier",
      "enabled": false
    },
    {
      "name": "query",
      "enabled": false
    },
    {
      "name": "allow",
      "enabled": false
    },
    {
      "name": "autopay",
      "enabled": false
    }
  ],
  "incentives": {
    "comment": {
      "elements": {},
      "totals": {
        "word": 0
      }
    }
  },
  "enable-access-control": {
    "label": false,
    "organization": true
  },
  "stale-bounty-time":"0d"
}

export default DefaultConfig;
