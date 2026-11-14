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
export async function mistral(messages: Array<{ role: 'system'|'user'|'assistant'; content: string }>, model?: string, stream = false) {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error('MISTRAL_API_KEY is missing. Add it to .env.local and restart the app.');
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: model || process.env.MISTRAL_PRIMARY_MODEL || 'mistral-large-4-0', messages, stream, temperature: .7 }), signal: AbortSignal.timeout(45000) });
  if (!response.ok) { const msg = await response.text(); throw Object.assign(new Error(msg.slice(0, 500) || 'Mistral request failed'), { status: response.status }); }
  return response;
}
export async function generate(messages: Array<{ role:'system'|'user'|'assistant'; content:string }>) {
  const primary = process.env.MISTRAL_PRIMARY_MODEL || 'mistral-large-4-0'; const fast = process.env.MISTRAL_FAST_MODEL || 'mistral-small-2603';
  let failure: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return { text: (await (await mistral(messages, primary)).json()).choices?.[0]?.message?.content as string, fast: false }; }
    catch (e) { failure = e; const status = (e as {status?:number}).status; if (status && status < 500 && status !== 429) throw e; if (attempt === 0) await new Promise(r => setTimeout(r, 500)); }
  }
  try { return { text: (await (await mistral(messages, fast)).json()).choices?.[0]?.message?.content as string, fast: true }; }
  catch { throw failure; }
}


