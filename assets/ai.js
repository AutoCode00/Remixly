// Client for the Worker's /remix routes. Without a Worker it answers from the offline remix (rule-based, no AI).
import { CONFIG } from './config.js';
import { FORMAT_IDS, cleanFormat, fitLimits, offlineFormat, offlineTweak, summaryOf, words, guessTitle } from './formats.js';
import { sleep } from './ui.js';

export const AI_LIVE = !!CONFIG.worker && !new URLSearchParams(location.search).has('offline');
const TIMEOUT = 90000;

async function post(path, body, timeout = TIMEOUT) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(CONFIG.worker.replace(/\/$/, '') + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'ai_unavailable'), { code: data.error || 'ai_unavailable', status: res.status });
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw Object.assign(new Error('timeout'), { code: 'timeout' });
    if (!e.code) e.code = 'network';
    throw e;
  } finally { clearTimeout(timer); }
}

export function aiMessage(e) {
  return e?.code === 'rate_limited' ? "That's today's limit. Come back tomorrow."
    : e?.code === 'timeout' ? 'That took too long. Try again.'
    : e?.code === 'unreadable' ? "We couldn't read that link (paywall or JavaScript-only page). Paste the text instead."
    : e?.code === 'bad_url' ? "That doesn't look like a public web address."
    : e?.code === 'too_short' ? 'The source is too short. Paste at least 80 words.'
    : e?.code === 'network' ? 'Could not reach Remixly. Check your connection and try again.'
    : 'Remi dropped the needle. Try again.';
}

/** Reads a URL (Worker) or summarises pasted text. Returns { title, text, url, words, long, summary }. */
export async function extract({ url, text, title }, voice) {
  if (url) {
    if (!AI_LIVE) throw Object.assign(new Error('unreadable'), { code: 'offline_link' });
    return post('/remix/extract', { url, voice }, 40000);
  }
  const n = words(text);
  if (!AI_LIVE || n < 40) { await sleep(350); return { title: title || guessTitle(text), text, url: '', words: n, long: n > 6000, summary: summaryOf(text) }; }
  try {
    const out = await post('/remix/extract', { text, title, voice }, 30000);
    return { ...out, title: out.title || title || guessTitle(text) };
  } catch { return { title: title || guessTitle(text), text, url: '', words: n, long: n > 6000, summary: summaryOf(text) }; }
}

/**
 * Creates the requested formats. Calls onFormat(id, content) as each one is ready.
 * Returns { formats, failed } — failed formats can be retried one by one.
 */
export async function remix(source, voice, ids = FORMAT_IDS, onFormat) {
  if (!AI_LIVE) {
    const formats = {};
    for (const id of ids) { await sleep(320 + Math.random() * 380); formats[id] = offlineFormat(id, source, voice); onFormat?.(id, formats[id]); }
    return { formats, failed: [] };
  }
  const out = await post('/remix/create', { source: { text: source.text, title: source.title, url: source.url }, voice, formats: ids });
  const formats = {};
  const failed = [...(out.failed || [])];
  for (const id of ids) {
    if (failed.includes(id)) continue;
    const c = cleanFormat(id, out.formats?.[id]);
    if (c) { formats[id] = fitLimits(id, c); onFormat?.(id, formats[id]); } else failed.push(id);
  }
  return { formats, failed, condensed: out.condensed };
}

export async function tweak(id, content, action, source, voice) {
  if (!AI_LIVE) { await sleep(450); return offlineTweak(id, content, action, source, voice); }
  const out = await post('/remix/tweak', { id, content, action, source: { text: source.text, title: source.title, url: source.url }, voice });
  const c = cleanFormat(id, out.content);
  if (!c) throw Object.assign(new Error('empty'), { code: 'empty' });
  return fitLimits(id, c);
}
