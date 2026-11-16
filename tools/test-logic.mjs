// Checks the shared format logic (assets/formats.js) and the Worker's link extraction + routes (no AI calls).
// Usage (from the project root): node tools/test-logic.mjs
import assert from 'node:assert/strict';
import {
  FORMAT_IDS, LIMITS, len, words, cleanFormat, overLimits, fitLimits, capHashtags, canonical, buildPack, packMarkdown,
  offlineRemix, offlineTweak, suggestedSchedule, guessTitle, keyPoints, videoWords,
} from '../assets/formats.js';
import { SAMPLES } from '../assets/samples.js';
import worker, { extractHtml } from '../worker/src/index.js';

let checks = 0;
const ok = (label) => { checks++; console.log(`  ✓ ${label}`); };
console.log('Format logic');

// counters count code points (Thai + emoji)
assert.equal(len('สวัสดี'), 6); assert.equal(len('👋🏽'), 2); assert.equal(words('one  two\nthree'), 3);
ok('character counters count code points; word count');

// hashtags capped at 2 across a whole format
assert.deepEqual(capHashtags(['a #one #two', 'b #three']), ['a #one #two', 'b']);
assert.equal(cleanFormat('x', { posts: ['1/5 Hello #a', '2/5 World #b #c'] }).posts.join('|'), 'Hello #a|World #b');
ok('max 2 hashtags; numbering stripped from AI thread posts');

// cleaning rejects junk, limits arrays
assert.equal(cleanFormat('x', { posts: [] }), null);
assert.equal(cleanFormat('carousel', { slides: Array(12).fill({ title: 't', line: 'l' }) }).slides.length, LIMITS.slidesMax);
assert.equal(cleanFormat('email', { subject: 's' }), null);
const v = cleanFormat('video', { hook: 'h', beats: [{ line: 'a' }, { line: 'b' }, { line: 'c' }], cta: 'c' });
assert.deepEqual(v.beats.map((b) => b.at), ['3–10s', '10–18s', '18–25s']);
ok('cleanFormat rejects empty output, caps slides, times video beats 3–25s');

// limits + fit
const long = { posts: ['x'.repeat(300), 'ok'] };
assert.equal(overLimits('x', long).length, 1);
assert.equal(len(fitLimits('x', long).posts[0]), LIMITS.xPost);
const em = { subject: 's'.repeat(90), body: Array(150).fill('w').join(' ') };
assert.equal(overLimits('email', em).length, 2);
assert.equal(overLimits('email', fitLimits('email', em)).length, 0);
ok('over-limit detection and [Shorten] trim to 280 / subject / 120 words');

// offline remix: every format, within limits, and only sentences from the source
const src = { ...SAMPLES.blog.source };
const voice = SAMPLES.blog.voice;
const out = offlineRemix(src, voice);
for (const id of FORMAT_IDS) {
  assert.ok(cleanFormat(id, out[id]), `offline ${id}`);
  assert.equal(overLimits(id, out[id]).filter((o) => id !== 'linkedin').length, 0, `offline ${id} within limits`);
}
assert.ok(out.x.posts.length >= LIMITS.xMin && out.x.posts.length <= LIMITS.xMax);
assert.ok(out.carousel.slides.length >= LIMITS.slidesMin && out.carousel.slides.length <= LIMITS.slidesMax);
assert.ok(videoWords(out.video) <= LIMITS.videoWords);
const srcLower = src.text.toLowerCase();
for (const p of keyPoints(src.text, 6)) assert.ok(srcLower.includes(p.toLowerCase().slice(0, 30)));
ok('offline remix: 6 formats within platform limits, built from source sentences');

for (const a of ['shorter', 'punchier', 'cta', 'regenerate']) for (const id of FORMAT_IDS) assert.ok(cleanFormat(id, offlineTweak(id, out[id], a, src, voice)), `${a} ${id}`);
assert.ok(offlineTweak('x', out.x, 'shorter', src, voice).posts.length <= out.x.posts.length);
ok('offline tweaks (shorter, punchier, add CTA, regenerate) keep every format valid');

// sample packs are valid and within limits
for (const s of Object.values(SAMPLES)) for (const id of FORMAT_IDS) {
  const c = cleanFormat(id, s.formats[id]);
  assert.ok(c, `sample ${id}`); assert.equal(overLimits(id, c).length, 0, `sample ${s.label} ${id} over limit: ${JSON.stringify(overLimits(id, c))}`);
}
ok('both sample packs are valid and inside every limit');

// pack JSON: canonical and stable
const pack = buildPack({ title: 'T', source: { kind: 'text', text: src.text }, voice, formats: out, schedule: suggestedSchedule() });
assert.equal(pack.app, 'remixly'); assert.equal(pack.source.text, undefined, 'source text never goes into the pack');
assert.equal(canonical({ b: 1, a: [{ d: 1, c: 2 }] }), '{"a":[{"c":2,"d":1}],"b":1}');
assert.equal(canonical(JSON.parse(canonical(pack))), canonical(pack));
const md = packMarkdown(pack);
assert.ok(md.includes('## X thread') && md.includes('- **Mon**: Thread 09:00') && md.includes('- **Sun**: —'));
assert.equal(guessTitle('My title\n\nBody text here.'), 'My title');
ok('pack JSON is canonical (sorted keys), excludes the source text; Markdown export has the calendar');

console.log('\nWorker');
const html = `<html><head><title>Ignored</title><meta property="og:title" content="Real &amp; title"></head><body>
  <nav><p>Home About Contact links that are long enough to count as a paragraph maybe</p></nav>
  <article><h1>Heading</h1>${Array.from({ length: 12 }, (_, i) => `<p>Paragraph ${i} has enough words in it to be kept by the reader, with &ldquo;quotes&rdquo; too.</p>`).join('')}<script>alert(1)</script></article>
  <footer><p>Footer text that should never be part of the extracted article body at all.</p></footer></body></html>`;
const ex = extractHtml(html);
assert.equal(ex.title, 'Real & title');
assert.ok(ex.text.includes('Heading') && ex.text.includes('Paragraph 11') && ex.text.includes('“quotes”'));
assert.ok(!/Footer text|alert|Home About/.test(ex.text));
ok('extract keeps the article (headings, paragraphs, entities) and drops nav, footer and scripts');

const call = (path, body, origin = 'http://localhost:4631') => worker.fetch(new Request(`https://w.example${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) }), { ALLOWED_ORIGINS: 'https://remixly.xyz' });
let r = await call('/remix/extract', { url: 'http://127.0.0.1/admin' });
assert.equal(r.status, 400); assert.equal((await r.json()).error, 'bad_url');
r = await call('/remix/extract', { url: 'file:///etc/passwd' });
assert.equal((await r.json()).error, 'bad_url');
r = await call('/remix/create', { source: { text: 'too short' } });
assert.equal(r.status, 400); assert.equal((await r.json()).error, 'too_short');
r = await call('/remix/tweak', { id: 'x', action: 'explode' });
assert.equal((await r.json()).error, 'bad_tweak');
r = await call('/upload', { content: '{"app":"other"}' });
assert.equal(r.status, 503);
r = await call('/remix/create', {}, 'https://evil.example');
assert.equal(r.status, 403);
r = await call('/nope', {});
assert.equal(r.status, 404);
r = await call('/remix/create', { source: { text: src.text } });
assert.equal(r.status, 502); assert.equal((await r.json()).error, 'ai_unavailable'); // no AI binding in tests
ok('routes: blocks private/odd URLs, short sources, bad tweaks, foreign origins; reports missing AI cleanly');

console.log(`\n${checks} checks passed`);
