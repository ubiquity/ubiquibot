export const getFallback = (value: string, target: string) => {
  console.warn(`using fallback value ${value} for ${target}`);
  return value;
};
