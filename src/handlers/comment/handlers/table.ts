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
  <html>
  <body>
  <!--StartFragment-->

  ${
    isBountyStale
      ? `| Warning! | This task was created over ${days} days ago. Please confirm that this issue specification is accurate before starting. |\n |--|--|`
      : ``
  }
  ${!isBountyStale ? `| Deadline | ${deadline} |\n |--|--|` : `| Deadline | ${deadline} |`}
  | Registered Wallet | ${wallet} |
  ${multiplier ? `| Payment Multiplier | ${multiplier} |` : ``}
  ${reason ? `| Multiplier Reason | ${reason} |` : ``}
  ${bounty ? `| Total Bounty | ${bounty} |` : ``}
    
  <!--EndFragment-->
  </body>
  </html>
`;
};
