import type {
  TicketLocalityDraft,
  TicketManagedLocality,
  TicketOptionItem,
} from '@/features/app-shell/types';

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

type RawSite = {
  id?: string;
  name?: string;
  localite?: string | null;
  locality?: string | null;
  departement?: string | null;
};

type RawManagedLocality = {
  id?: string | number;
  name?: string;
  value?: string;
  label?: string;
  countryCode?: string;
  countryName?: string;
  departement?: string;
  city?: string;
  arrondissement?: string;
  quartier?: string;
  address?: string;
  reference?: string;
};

export function parseTicketSitePayload(
  sitesData: unknown,
  baseDepartments: string[]
): {
  siteOptions: TicketOptionItem[];
  departments: string[];
  localities: string[];
} {
  if (!Array.isArray(sitesData)) {
    return { siteOptions: [], departments: [...baseDepartments], localities: [] };
  }

  const siteOptions = sitesData
    .map((site) => site as RawSite)
    .map((site) => ({
      id: String(site.id ?? site.name ?? ''),
      name: String(site.name ?? '').trim(),
      localite: site.localite ?? site.locality ?? null,
      departement: site.departement ?? null,
    }))
    .filter((site) => Boolean(site.id) && Boolean(site.name));

  const departmentsSet = new Set<string>();
  baseDepartments.forEach((department) => departmentsSet.add(department));
  siteOptions.forEach((site) => {
    const department = normalizeTicketLocality(site.departement ?? '');
    if (department) departmentsSet.add(department);
  });

  const localitySet = new Set<string>();
  siteOptions.forEach((site) => {
    const siteLocality = normalizeTicketLocality(site.localite ?? '');
    if (!siteLocality) return;
    siteLocality
      .split(',')
      .map((part) => normalizeTicketLocality(part))
      .filter(Boolean)
      .forEach((locality) => localitySet.add(locality));
  });

  return {
    siteOptions,
    departments: Array.from(departmentsSet).sort((left, right) => left.localeCompare(right, 'fr')),
    localities: Array.from(localitySet),
  };
}

export function parseManagedLocalitiesPayload(localitiesData: unknown): {
  managedEntries: TicketManagedLocality[];
  localities: string[];
} {
  if (!Array.isArray(localitiesData)) {
    return { managedEntries: [], localities: [] };
  }

  const managedEntries = localitiesData
    .filter((locality): locality is RawManagedLocality =>
      typeof locality === 'object' && locality !== null && 'id' in locality
    )
    .map((locality) => ({
      id: String(locality.id ?? '').trim(),
      name: normalizeTicketLocality(String(locality.name ?? '')),
      countryCode: locality.countryCode,
      countryName: locality.countryName,
      departement: normalizeTicketLocality(String(locality.departement ?? '')),
      city: normalizeTicketLocality(String(locality.city ?? '')),
      arrondissement: normalizeTicketLocality(String(locality.arrondissement ?? '')),
      quartier: normalizeTicketLocality(String(locality.quartier ?? '')),
      address: String(locality.address ?? '').trim(),
      reference: String(locality.reference ?? '').trim(),
    }))
    .filter((locality) => Boolean(locality.id))
    .filter((locality) => Boolean(locality.name))
    .sort((left, right) => left.name.localeCompare(right.name, 'fr'));

  const localitySet = new Set<string>();
  localitiesData
    .map((locality) => {
      if (typeof locality === 'string') {
        return normalizeTicketLocality(locality);
      }
      const entry = locality as RawManagedLocality;
      return normalizeTicketLocality(String(entry.name ?? entry.value ?? entry.label ?? ''));
    })
    .filter(Boolean)
    .forEach((locality) => localitySet.add(locality));

  return { managedEntries, localities: Array.from(localitySet) };
}
