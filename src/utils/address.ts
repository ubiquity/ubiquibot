export const shortenEthAddress = (address: string) => {
  const prefix = address.substring(0, 6);
  const suffix = address.substring(address.length - 4);
  return `${prefix}...${suffix}`;
};

export const formatEthAddress = (address: string) => {
  return "`" + address + "`";
};
