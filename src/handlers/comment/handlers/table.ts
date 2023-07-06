export const tableComment = (deadline: string, wallet: string, multiplier: string, reason: string, bouty: string) => {
  return `
  <code>

  <table>
  <tr>
    <td style="border:1px solid"></td>
    <td style="border:1px solid"></td>
  </tr>
  <tr>
    <td style="border:1px solid">Deadline</td>
    <td style="border:1px solid">${deadline}</td>
  </tr>
  <tr>
    <td style="border:1px solid">Registered Wallet</td>
    <td style="border:1px solid">${wallet}</td>
  </tr>
  <tr>
    <td style="border:1px solid">Payment Multiplier</td>
    <td style="border:1px solid">${multiplier}</td>
  </tr>
  <tr>
    <td style="border:1px solid">Multiplier Reason</td>
    <td style="border:1px solid">${reason}</td>
  </tr>
  <tr>
    <td style="border:1px solid">Total Bounty</td>
    <td style="border:1px solid">${bouty}</td>
  </tr>
  </table>
  </code>`;
};
