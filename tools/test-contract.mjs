// Runs the compiled PackRegistry on an in-memory chain and checks the PRD rules (section 5).
// Usage (from the project root): node tools/compile.mjs && node tools/test-contract.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ganache from 'ganache';
import { BrowserProvider, ContractFactory, Interface, keccak256, toUtf8Bytes } from 'ethers';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { abi, bytecode } = JSON.parse(readFileSync(join(root, 'build/PackRegistry.json'), 'utf8'));
const chain = ganache.provider({ logging: { quiet: true }, chain: { hardfork: 'merge', chainId: 677, vmErrorsOnRPCResponse: true }, wallet: { totalAccounts: 4 } });
const provider = new BrowserProvider(chain);
const [alice, bob] = await Promise.all([0, 1].map((i) => provider.getSigner(i)));
const GAS = { gasLimit: 3_000_000 };
const reg = await (await new ContractFactory(abi, bytecode, alice).deploy()).waitForDeployment();
const as = (s) => reg.connect(s);
const iface = new Interface(abi);
const sel = (name) => iface.getError(name).selector.slice(2);
const dump = (e) => { try { return JSON.stringify(e, (k, v) => (typeof v === 'bigint' ? String(v) : v)); } catch { return String(e?.message); } };
const reverts = (call, name) => assert.rejects(call, (e) => e.revert?.name === name || dump(e).includes(sel(name)), `expected ${name}`);
let checks = 0;
const ok = (label) => { checks++; console.log(`  ✓ ${label}`); };
const h = (s) => keccak256(toUtf8Bytes(s));

console.log('PackRegistry contract');

// ---- publish
const r = await (await as(alice).publish('Why we moved to BOT Chain', h('src'), h('pack'), 'bafypack1', 6, GAS)).wait();
console.log(`    gas publish ≈ ${r.gasUsed}`);
assert.equal(Number(await reg.total()), 1);
const p = await reg.getPack(0);
assert.equal(p.owner, alice.address); assert.equal(p.title, 'Why we moved to BOT Chain');
assert.equal(p.sourceHash, h('src')); assert.equal(p.packHash, h('pack')); assert.equal(p.cid, 'bafypack1');
assert.equal(Number(p.formats), 6); assert.equal(Number(p.posted), 0); assert.ok(Number(p[7]) > 0);
const ev = iface.parseLog(r.logs[0]);
assert.equal(ev.name, 'Published'); assert.equal(Number(ev.args.id), 0); assert.equal(ev.args.owner, alice.address);
ok('publish stores owner, title, hashes, cid, formats, time and emits Published(id, owner)');

// ---- publish limits
await reverts(as(alice).publish.staticCall('', h('s'), h('p'), 'c', 6, GAS), 'EmptyTitle');
await reverts(as(alice).publish.staticCall('x'.repeat(61), h('s'), h('p'), 'c', 6, GAS), 'TitleTooLong');
await (await as(alice).publish('x'.repeat(60), h('s'), h('p'), '', 10, GAS)).wait();
await reverts(as(alice).publish.staticCall('ok', h('s'), h('p'), 'c', 0, GAS), 'BadFormats');
await reverts(as(alice).publish.staticCall('ok', h('s'), h('p'), 'c', 11, GAS), 'BadFormats');
await reverts(as(alice).publish.staticCall('ok', h('s'), h('p'), 'c'.repeat(101), 6, GAS), 'CidTooLong');
ok('title 1–60 bytes, formats 1–10, cid ≤ 100 bytes');

// ---- markPosted
const url = 'https://x.com/remixly/status/1';
const m = await (await as(alice).markPosted(0, 0, url, GAS)).wait();
console.log(`    gas markPosted ≈ ${m.gasUsed}`);
const pe = iface.parseLog(m.logs[0]);
assert.equal(pe.name, 'Posted'); assert.equal(Number(pe.args.id), 0); assert.equal(Number(pe.args.formatIndex), 0); assert.equal(pe.args.url, url);
assert.equal(await reg.isPosted(0, 0), true);
assert.equal(await reg.postedUrlHash(0, 0), h(url));
assert.equal(Number((await reg.getPack(0)).posted), 1);
assert.equal(Number(await reg.postsLive()), 1);
ok('markPosted sets isPosted, stores the URL hash, emits Posted(id, formatIndex, url)');

await (await as(alice).markPosted(0, 0, url + '?fixed', GAS)).wait();
assert.equal(Number((await reg.getPack(0)).posted), 1);
assert.equal(Number(await reg.postsLive()), 1);
assert.equal(await reg.postedUrlHash(0, 0), h(url + '?fixed'));
await (await as(alice).markPosted(0, 3, 'https://linkedin.com/p/1', GAS)).wait();
assert.equal(Number((await reg.getPack(0)).posted), 2);
assert.equal(Number(await reg.postsLive()), 2);
ok('posted counts each format once; marking again only replaces the link');

await reverts(as(bob).markPosted.staticCall(0, 1, url, GAS), 'NotOwner');
await reverts(as(alice).markPosted.staticCall(0, 6, url, GAS), 'BadFormatIndex');
await reverts(as(alice).markPosted.staticCall(9, 0, url, GAS), 'NoSuchPack');
await reverts(as(alice).markPosted.staticCall(0, 1, '', GAS), 'BadUrl');
await reverts(as(alice).markPosted.staticCall(0, 1, 'h'.repeat(201), GAS), 'BadUrl');
await (await as(alice).markPosted(0, 1, 'h'.repeat(200), GAS)).wait();
ok('owner only, formatIndex < formats, url 1–200 bytes');

// ---- views
await (await as(bob).publish('Bob pack', h('s2'), h('p2'), 'bafybob', 6, GAS)).wait();
assert.equal(Number(await reg.total()), 3);
assert.deepEqual((await reg.packsBy(alice.address)).map(Number), [0, 1]);
assert.deepEqual((await reg.packsBy(bob.address)).map(Number), [2]);
const page = await reg.getPacks(1, 10);
assert.equal(page.length, 2); assert.equal(page[1].title, 'Bob pack');
assert.equal((await reg.getPacks(5, 3)).length, 0);
await reverts(reg.getPack(3), 'NoSuchPack');
ok('getPack, getPacks (clipped), packsBy, total');

console.log(`\n${checks} checks passed`);
process.exit(0);
