export const tableComment = ({
  deadline,
  wallet,
  multiplier,
  reason,
  bounty,
}: {
  deadline: string;
  wallet: string;
  multiplier?: string;
  reason?: string;
  bounty?: string;
}) => {
  return `
<code>

  <table>
  <tr>
    <td></td>
    <td></td>
  </tr>
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
      ? `<tr>
  <td>Payment Multiplier</td>
  <td>${multiplier}</td>
</tr>`
      : ``
  }
  ${
    reason
      ? `<tr>
  <td>Multiplier Reason</td>
  <td>${reason}</td>
</tr>`
      : ``
  }
  ${
    bounty
      ? `<tr>
  <td>Total Bounty</td>
  <td>${bounty}</td>
</tr>`
      : ``
  }
  </table>
</code>`;
};
