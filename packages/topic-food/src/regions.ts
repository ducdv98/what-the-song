import type { Dish } from './catalogue.ts';

export const REGIONS = [
  { value: 'bac', labels: { vi: 'Bắc', en: 'North' } },
  { value: 'trung', labels: { vi: 'Trung', en: 'Central' } },
  { value: 'nam', labels: { vi: 'Nam', en: 'South' } },
  { value: 'tay-nguyen', labels: { vi: 'Tây Nguyên', en: 'Central Highlands' } },
  { value: 'toan-quoc', labels: { vi: 'Toàn quốc', en: 'Nationwide' } },
] as const;

export type Region = (typeof REGIONS)[number]['labels']['vi'];

export function isRegion(value: unknown): value is Region {
  return typeof value === 'string' && REGIONS.some((region) => region.labels.vi === value);
}

export function regionOf(dish: Pick<Dish, 'region'>): Region {
  return dish.region ?? 'Toàn quốc';
}

export function availableRegions(dishes: readonly Dish[]) {
  const counts = new Map<Region, number>();
  for (const dish of dishes) {
    const region = regionOf(dish);
    counts.set(region, (counts.get(region) ?? 0) + 1);
  }
  return REGIONS.filter(({ labels }) => counts.has(labels.vi)).map(({ value, labels }) => ({
    value, labels, count: counts.get(labels.vi)!,
  }));
}

export function regionFacetValue(dish: Pick<Dish, 'region'>): string {
  return REGIONS.find(({ labels }) => labels.vi === regionOf(dish))!.value;
}
