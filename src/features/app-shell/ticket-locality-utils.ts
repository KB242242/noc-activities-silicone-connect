import type { TicketLocalityDraft } from '@/features/app-shell/types';

export type CreateLocalityRequestBody = {
  name: string;
  countryCode?: string;
  countryName?: string;
  departement: string;
  city: string;
  arrondissement: string;
  quartier: string;
  address?: string;
  reference?: string;
};

export function splitTicketValues(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeTicketLocality(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  return cleaned
    .split(/(\s+|-|')/)
    .map((chunk) => {
      if (!chunk || /^(\s+|-|')$/.test(chunk)) return chunk;
      const [first, ...rest] = chunk;
      return `${first.toUpperCase()}${rest.join('').toLowerCase()}`;
    })
    .join('');
}

export function prepareCreateLocality(payload: Partial<TicketLocalityDraft>): {
  canCreate: boolean;
  fallbackName: string;
  requestBody: CreateLocalityRequestBody;
} {
  const freeText = normalizeTicketLocality(payload.freeText ?? '');
  const departement = normalizeTicketLocality(payload.departement ?? '');
  const city = normalizeTicketLocality(payload.city ?? '');
  const arrondissement = normalizeTicketLocality(payload.arrondissement ?? '');
  const quartier = normalizeTicketLocality(payload.quartier ?? '');
  const fallbackName = freeText || city || departement || arrondissement || quartier;

  const canCreate = Boolean(
    freeText ||
      departement ||
      payload.city?.trim() ||
      payload.arrondissement?.trim() ||
      payload.quartier?.trim() ||
      payload.address?.trim() ||
      payload.reference?.trim()
  );

  return {
    canCreate,
    fallbackName,
    requestBody: {
      name: fallbackName,
      countryCode: payload.countryCode,
      countryName: payload.countryName,
      departement,
      city,
      arrondissement,
      quartier,
      address: payload.address,
      reference: payload.reference,
    },
  };
}

export function resolveCreatedLocalityName(created: any, fallbackName: string): string {
  return normalizeTicketLocality(
    String(created?.name ?? created?.label ?? created?.value ?? fallbackName)
  );
}
