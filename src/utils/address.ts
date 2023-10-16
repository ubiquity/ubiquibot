const shortenEthAddress = (address: string, len: number) => {
  let prefixLength = 6;
  let suffixLength = 5;

  if (len > 13) {
    const isEven = len % 2 === 0;
    prefixLength = isEven ? len / 2 + 1 : Math.ceil(len / 2);
    suffixLength = isEven ? len / 2 - 1 : Math.floor(len / 2);
  }
  const prefix = address.substring(0, prefixLength);
  const suffix = address.substring(address.length - suffixLength);

  return `${prefix}...${suffix}`;
};
