import appState from '../api/app-state';
import studyLogs from '../api/study-logs';
import temple from '../api/temple';

type Env = { ASSETS: { fetch: (request: Request) => Promise<Response> } };
type ApiRequest = Parameters<typeof appState>[0];
type ApiResponse = Parameters<typeof appState>[1];

const handlers = new Map([
  ['/api/app-state', appState],
  ['/api/study-logs', studyLogs],
  ['/api/temple', temple],
]);
const maxBodyBytes = 4_100_000; // The app-state API allows 1M characters, including Unicode.

async function readJson(request: Request): Promise<unknown> {
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBodyBytes) {
        await reader.cancel();
        throw new RangeError('Request body too large');
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text ? JSON.parse(text) : undefined;
  } finally {
    reader.releaseLock();
  }
}

const jsonError = (status: number, error: string) => Response.json({ error }, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path !== '/api' && !path.startsWith('/api/')) return env.ASSETS.fetch(request);
    const handler = handlers.get(path);
    if (!handler) return jsonError(404, 'API endpoint not found');

    let body: unknown;
    if (request.method === 'POST' || request.method === 'PUT') {
      try {
        body = await readJson(request);
      } catch (error) {
        return error instanceof RangeError
          ? jsonError(413, 'Request body too large')
          : jsonError(400, 'Invalid JSON payload');
      }
    }

    // nodejs_compat exposes Worker variables/secrets through process.env.
    // Reuse the same authentication, encryption and ledger handlers as Vercel.
    const apiRequest: ApiRequest = {
      method: request.method,
      headers: Object.fromEntries(request.headers),
      body,
    };
    const headers = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    let status = 200;
    let response: Response | undefined;
    const apiResponse: ApiResponse = {
      status(code) { status = code; return apiResponse; },
      setHeader(name, value) { headers.set(name, value); },
      json(value) { response = Response.json(value, { status, headers }); },
    };
    try {
      await handler(apiRequest, apiResponse);
      return response || jsonError(500, 'API did not return a response');
    } catch {
      return jsonError(500, 'Service is temporarily unavailable');
    }
  },
};
