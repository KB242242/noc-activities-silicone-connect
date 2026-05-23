type UsersRequestMethod = 'POST' | 'PUT' | 'PATCH';

async function requestUsersApi(method: UsersRequestMethod, payload: Record<string, unknown>): Promise<any> {
  const response = await fetch('/api/users', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.success || !result?.user) {
    throw new Error(result?.error || 'users_api_request_failed');
  }

  return result;
}

export async function changeOwnPasswordRequest(params: {
  userId: string;
  actorId: string;
  newPassword: string;
}): Promise<any> {
  return requestUsersApi('PATCH', {
    userId: params.userId,
    actorId: params.actorId,
    newPassword: params.newPassword,
    changePassword: true,
  });
}

export async function updateUserRoleRequest(params: {
  adminId: string;
  userId: string;
  role: string;
}): Promise<any> {
  return requestUsersApi('PUT', {
    adminId: params.adminId,
    userId: params.userId,
    role: params.role,
  });
}

export async function createUserRequest(params: {
  adminId: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  role: string;
  shiftId?: string;
  responsibility?: string;
}): Promise<any> {
  return requestUsersApi('POST', params);
}

export async function updateUserRequest(params: {
  adminId: string;
  userId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string | null;
  role: string;
  shiftId: string | null;
  responsibility: string | null;
  isActive: boolean;
  isBlocked: boolean;
}): Promise<any> {
  return requestUsersApi('PUT', params);
}

export async function toggleUserBlockRequest(params: {
  adminId: string;
  userId: string;
  isBlocked: boolean;
}): Promise<any> {
  return requestUsersApi('PUT', params);
}

export async function resetUserPasswordRequest(params: {
  adminId: string;
  targetUserId: string;
  newPassword: string;
}): Promise<any> {
  return requestUsersApi('PATCH', {
    adminId: params.adminId,
    targetUserId: params.targetUserId,
    newPassword: params.newPassword,
    forceResetPassword: true,
  });
}

export async function deleteUserRequest(params: {
  adminId: string;
  userId: string;
  permanent?: boolean;
}): Promise<any> {
  const response = await fetch(
    `/api/users?adminId=${encodeURIComponent(params.adminId)}&userId=${encodeURIComponent(params.userId)}&permanent=${params.permanent ? 'true' : 'false'}`,
    { method: 'DELETE' }
  );

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || 'users_delete_failed');
  }

  return result;
}
