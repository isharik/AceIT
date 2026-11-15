import { NextRequest, NextResponse } from 'next/server';

const hits = new Map<string, { count: number; start: number }>();
export function limited(req: NextRequest): NextResponse | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const now = Date.now(); const item = hits.get(ip);
  if (!item || now - item.start > 60_000) hits.set(ip, { count: 1, start: now });
  else if (++item.count > 25) return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  return null;
}
export function safeText(v: unknown, max = 16000): string { return typeof v === 'string' ? v.split('\u0000').join('').slice(0, max).trim() : ''; }
export async function chatCompletion(messages: Array<{ role: 'system'|'user'|'assistant'; content: string }>, model?: string) {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error('NVIDIA_API_KEY is missing. Add it to .env.local and restart the app.');
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ model: model || process.env.NVIDIA_PRIMARY_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b', messages, stream: false, temperature: .7, max_tokens: 4096 }), signal: AbortSignal.timeout(45000) });
  if (!response.ok) { const msg = await response.text(); throw Object.assign(new Error(msg.slice(0, 500) || 'NVIDIA endpoint request failed'), { status: response.status }); }
  return response;
}
export async function chatStream(messages: Array<{ role: 'system'|'user'|'assistant'; content: string }>) {
  const primary = process.env.NVIDIA_PRIMARY_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';
  const fast = process.env.NVIDIA_FAST_MODEL || 'openai/gpt-oss-20b';
  let failure: Error | undefined;
  for (const [model, isFast] of [[primary, false], [fast, true]] as const) {
    try {
      const key = process.env.NVIDIA_API_KEY;
      if (!key) throw new Error('NVIDIA_API_KEY is missing. Add it to Vercel and redeploy.');
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ model, messages, stream: true, temperature: .7, max_tokens: 4096 }),
        signal: AbortSignal.timeout(45000),
      });
      if (response.ok && response.body) return { response, fast: isFast };
      const detail = (await response.text()).slice(0, 500);
      failure = Object.assign(new Error(detail || 'NVIDIA endpoint request failed'), { status: response.status });
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      failure = error instanceof Error ? error : new Error('NVIDIA endpoint request failed');
      const status = (error as { status?: number }).status;
      if (status && status < 500 && status !== 429) break;
    }
  }
  throw failure || new Error('NVIDIA endpoint request failed.');
}
export async function generate(messages: Array<{ role:'system'|'user'|'assistant'; content:string }>) {
  const primary = process.env.NVIDIA_PRIMARY_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b'; const fast = process.env.NVIDIA_FAST_MODEL || 'openai/gpt-oss-20b';
  let failure: unknown;
  try { return { text: (await (await chatCompletion(messages, primary)).json()).choices?.[0]?.message?.content as string, fast: false }; }
  catch (e) { failure = e; const status = (e as {status?:number}).status; if (status && status < 500 && status !== 429) throw e; }
  try { return { text: (await (await chatCompletion(messages, fast)).json()).choices?.[0]?.message?.content as string, fast: true }; }
  catch { throw failure; }
}


