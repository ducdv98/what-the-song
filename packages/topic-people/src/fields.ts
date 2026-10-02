import type { Person } from './catalogue.ts';

export const FIELDS = [
  { value: 'ca-si', labels: { vi: 'Ca sĩ', en: 'Singer' } },
  { value: 'dien-vien', labels: { vi: 'Diễn viên', en: 'Actor' } },
  { value: 'mc-hai', labels: { vi: 'MC / Hài', en: 'MC / Comedy' } },
  { value: 'streamer', labels: { vi: 'Streamer', en: 'Streamer' } },
  { value: 'influencer', labels: { vi: 'Influencer', en: 'Influencer' } },
] as const;

export type Field = (typeof FIELDS)[number]['labels']['vi'];

export function isField(value: unknown): value is Field {
  return typeof value === 'string' && FIELDS.some((field) => field.labels.vi === value);
}

export function availableFields(people: readonly Person[]) {
  const counts = new Map<Field, number>();
  for (const person of people) {
    counts.set(person.field, (counts.get(person.field) ?? 0) + 1);
  }
  return FIELDS.filter(({ labels }) => counts.has(labels.vi)).map(({ value, labels }) => ({
    value, labels, count: counts.get(labels.vi)!,
  }));
}

export function fieldFacetValue(person: Pick<Person, 'field'>): string {
  return FIELDS.find(({ labels }) => labels.vi === person.field)!.value;
}
