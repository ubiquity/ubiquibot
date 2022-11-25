const DEFAULT_BASE_VALUE = 1000;

export const calculateBountyPrice = (timeValue: number, profitValue: number, baseValue?: number): number => {
  const base = baseValue ?? DEFAULT_BASE_VALUE;
  const profit = profitValue / 10; // floats cause bad math
  const price = base * timeValue * profit;
  return price;
};
