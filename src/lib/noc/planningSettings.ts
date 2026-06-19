export type NocPlanningSettings = {
  permissions: {
    enablePdfGeneration: boolean;
    pdfAllowedRoles: string[];
  };
  visibility: {
    individualRestVisibleRoles: string[];
    individualRestLabelMode: 'FULL_NAME' | 'PSEUDO';
    individualRestNameOverrides: Record<string, string>;
  };
  updatedAt: string;
  updatedBy: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeRole(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, '_');
}

function normalizeRoles(value: unknown, fallback: string[]): string[] {
  const source = Array.isArray(value) ? value : fallback;
  const normalized = Array.from(
    new Set(source.map((entry) => normalizeRole(entry)).filter(Boolean))
  );

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeRestLabelMode(value: unknown): 'FULL_NAME' | 'PSEUDO' {
  const normalized = String(value ?? '').trim().toUpperCase();
  return normalized === 'PSEUDO' ? 'PSEUDO' : 'FULL_NAME';
}

function normalizeNameOverrides(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const safe: Record<string, string> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, rawLabel]) => {
    const memberName = String(key ?? '').trim();
    const label = String(rawLabel ?? '').trim();
    if (!memberName || !label) return;
    safe[memberName] = label;
  });

  return safe;
}

export function defaultNocPlanningSettings(): NocPlanningSettings {
  return {
    permissions: {
      enablePdfGeneration: true,
      pdfAllowedRoles: ['TECHNICIEN_NO', 'RESPONSABLE', 'ADMIN', 'SUPER_ADMIN'],
    },
    visibility: {
      individualRestVisibleRoles: ['TECHNICIEN_NO', 'RESPONSABLE', 'ADMIN', 'SUPER_ADMIN'],
      individualRestLabelMode: 'FULL_NAME',
      individualRestNameOverrides: {},
    },
    updatedAt: nowIso(),
    updatedBy: null,
  };
}

export function sanitizeNocPlanningSettings(raw: Partial<NocPlanningSettings> | null | undefined): NocPlanningSettings {
  const defaults = defaultNocPlanningSettings();

  return {
    permissions: {
      enablePdfGeneration: Boolean(raw?.permissions?.enablePdfGeneration ?? defaults.permissions.enablePdfGeneration),
      pdfAllowedRoles: normalizeRoles(raw?.permissions?.pdfAllowedRoles, defaults.permissions.pdfAllowedRoles),
    },
    visibility: {
      individualRestVisibleRoles: normalizeRoles(
        raw?.visibility?.individualRestVisibleRoles,
        defaults.visibility.individualRestVisibleRoles
      ),
      individualRestLabelMode: normalizeRestLabelMode(raw?.visibility?.individualRestLabelMode),
      individualRestNameOverrides: normalizeNameOverrides(raw?.visibility?.individualRestNameOverrides),
    },
    updatedAt: String(raw?.updatedAt ?? defaults.updatedAt),
    updatedBy: raw?.updatedBy ? String(raw.updatedBy) : null,
  };
}
