export async function attemptLoginRequest(params: {
  login: string;
  password: string;
}): Promise<{ ok: boolean; result: any }> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: params.login,
      password: params.password,
    }),
  });

  const result = await response.json().catch(() => ({}));
  return { ok: response.ok, result };
}