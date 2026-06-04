const TICKET_MANAGEMENT_ROLE_SET = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'RESPONSABLE',
  'MANAGER',
  'TECHNICIEN',
  'AGENT',
  'TECHNICIEN_NO',
  'TECHNICIEN_NOC',
  'AGENT_NOC',
]);

const TICKET_APPROVAL_ROLE_SET = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'RESPONSABLE',
  'SUPERVISOR',
  'MANAGER',
]);

function normalizeRoleAlias(role: string): string {
  if (role === 'SUPERVISOR') return 'RESPONSABLE';
  if (role === 'NOC_AGENT') return 'TECHNICIEN_NO';
  return role;
}

export function normalizeTicketManagementRole(role: unknown): string {
  const normalized = String(role ?? '').trim().toUpperCase();
  if (!normalized) return '';
  return normalizeRoleAlias(normalized);
}

export function canManageTicketEntities(role: unknown): boolean {
  return TICKET_MANAGEMENT_ROLE_SET.has(normalizeTicketManagementRole(role));
}

export function canManageTicketApprovalFlow(role: unknown): boolean {
  const normalized = normalizeTicketManagementRole(role);
  return TICKET_APPROVAL_ROLE_SET.has(normalized);
}

export function canDecideTicketApproval(role: unknown): boolean {
  const normalized = normalizeTicketManagementRole(role);
  return normalized === 'MANAGER' || normalized === 'RESPONSABLE';
}

export function normalizeActorId(input: unknown): string {
  return String(input ?? '').trim();
}

export async function resolveTicketManagerFromActorId(
  db: any,
  actorId: unknown
): Promise<{ actorId: string; role: string; canManage: boolean }> {
  const normalizedActorId = normalizeActorId(actorId);
  if (!normalizedActorId) {
    return { actorId: '', role: '', canManage: false };
  }

  const actor = await db.user.findUnique({
    where: { id: normalizedActorId },
    select: { id: true, role: true },
  }).catch(() => null);

  const role = normalizeTicketManagementRole(actor?.role);
  return {
    actorId: normalizedActorId,
    role,
    canManage: canManageTicketEntities(role),
  };
}
