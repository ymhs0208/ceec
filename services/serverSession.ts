// Call using the user's signed bearer token, never the service-role token.
// getUser alone does not establish that the JWT's session is still present.
export const isServerSessionActive = async (token: string, config: { url: string; anonKey: string }): Promise<boolean> => {
  const response = await fetch(`${config.url}/rest/v1/rpc/is_current_session_active`, {
    method: 'POST',
    headers: { apikey: config.anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) throw new Error('Unable to validate the current auth session');
  return await response.json() === true;
};
