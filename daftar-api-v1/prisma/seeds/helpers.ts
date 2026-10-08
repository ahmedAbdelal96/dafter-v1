export const daysAgo = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

export const daysFromNow = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

export const asDateOnly = (value: Date): Date =>
  new Date(value.toISOString().split('T')[0]);

export const toMoney = (value: number): number => Number(value.toFixed(2));

export const chunk = <T>(items: T[], size: number): T[][] => {
  if (size <= 0) return [items];

  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

export const pickCycleValue = <T>(source: T[], index: number): T =>
  source[index % source.length];
