export const shortenEthAddress = (address: string, len: number) => {
  let prefLen = 6;
  let suffLen = 5;

  if (len > 13) {
    const isEven = len % 2 === 0;
    prefLen = isEven ? len / 2 + 1 : Math.ceil(len / 2);
    suffLen = isEven ? len / 2 - 1 : Math.floor(len / 2);
  }
  const prefix = address.substring(0, prefLen);
  const suffix = address.substring(address.length - suffLen);

  return `${prefix}...${suffix}`;
};

export const formatEthAddress = (address: string) => {
  return "`" + address + "`";
};
