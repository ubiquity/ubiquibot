export const tableComment = ({
  deadline,
  wallet,
  multiplier,
  reason,
  bounty,
  isBountyStale,
  days,
}: {
  deadline: string;
  wallet: string;
  multiplier?: string;
  reason?: string;
  bounty?: string;
  isBountyStale?: boolean;
  days?: number;
}) => {
  return `
<table>
  ${
    isBountyStale
      ? `
  <tr>
    <td>Warning!</td> 
    <td>This task was created over ${days} days ago. Please confirm that this issue specification is accurate before starting.</td>
  </tr>`
      : ``
  }
  <tr>
    <td>Deadline</td>
    <td>${deadline}</td>
  </tr>
  <tr>
    <td>Registered Wallet</td>
    <td>${wallet}</td>
  </tr>
  ${
    multiplier
      ? `
  <tr>
    <td>Payment Multiplier</td>
    <td>${multiplier}</td>
  </tr>`
      : ``
  }
  ${
    reason
      ? `
  <tr>
    <td>Multiplier Reason</td>
    <td>${reason}</td>
  </tr>`
      : ``
  }
  ${
    bounty
      ? `
  <tr>
    <td>Total Bounty</td>
    <td>${bounty}</td>
  </tr>`
      : ``
  }
</table>
`;
};
