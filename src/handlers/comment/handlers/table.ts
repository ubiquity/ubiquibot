export const tableComment = ({
  deadline,
  wallet,
  multiplier,
  reason,
  bounty,
}: {
  deadline: string;
  wallet: string;
  multiplier: string;
  reason: string;
  bounty: string;
}) => {
  return `
<code>

  <table>
  <tr>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td style="font-family: monospace;">Deadline</td>
    <td style="font-family: monospace;">${deadline}</td>
  </tr>
  <tr>
    <td style="font-family: monospace;">Registered Wallet</td>
    <td style="font-family: monospace;">${wallet}</td>
  </tr>
  <tr>
    <td style="font-family: monospace;">Payment Multiplier</td>
    <td style="font-family: monospace;">${multiplier}</td>
  </tr>
  <tr>
    <td style="font-family: monospace;">Multiplier Reason</td>
    <td style="font-family: monospace;">${reason}</td>
  </tr>
  <tr>
    <td style="font-family: monospace;">Total Bounty</td>
    <td style="font-family: monospace;">${bounty}</td>
  </tr>
  </table>
</code>`;
};
