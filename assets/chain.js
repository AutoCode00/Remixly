// Wallet (MetaMask), BOT Chain, the PackRegistry contract (live, or a simulated preview registry) and IPFS.
/* global ethers */
import { CONFIG } from './config.js';
import { store } from './ui.js';
import { canonical } from './formats.js';

const PACK = 'tuple(address owner, string title, bytes32 sourceHash, bytes32 packHash, string cid, uint8 formats, uint8 posted, uint64 at)';
const ABI = [
  'function publish(string title, bytes32 sourceHash, bytes32 packHash, string cid, uint8 formats) returns (uint256 id)',
  'function markPosted(uint256 id, uint8 formatIndex, string url)',
  `function getPack(uint256 id) view returns (${PACK})`,
  `function getPacks(uint256 from, uint256 count) view returns (${PACK}[])`,
  'function packsBy(address owner) view returns (uint256[])',
  'function total() view returns (uint256)',
  'function postsLive() view returns (uint256)',
  'function isPosted(uint256, uint8) view returns (bool)',
  'event Published(uint256 indexed id, address indexed owner)',
  'event Posted(uint256 indexed id, uint8 formatIndex, string url)',
];

const params = new URLSearchParams(location.search);
export const NET_KEY = params.get('net') === 'testnet' ? 'testnet' : 'mainnet';
export const NET = CONFIG.networks[NET_KEY];
const K = CONFIG.storageKey;
// A contract deployed from deploy.html on this machine is picked up automatically (handy before config.js is edited).
export const CONTRACT = params.has('preview') ? '' : NET.contract || store.get(`${K}.contract.${NET.chainId}`, '') || '';
export const LIVE = /^0x[0-9a-fA-F]{40}$/.test(CONTRACT);
export const MAINNET_ADDRESS = CONFIG.networks.mainnet.contract || '';
export const explorerAddress = () => `${CONFIG.networks.mainnet.explorer}/address/${MAINNET_ADDRESS || '<MAINNET_CONTRACT_ADDRESS>'}`;
export const explorerTx = (hash) => `${NET.explorer}/tx/${hash}`;

// ---------- wallet ----------
export const wallet = { account: null, chainId: null };
const listeners = new Set();
export const onWallet = (fn) => { listeners.add(fn); fn(wallet); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => { try { fn(wallet); } catch (e) { console.error(e); } });
export const hasMetaMask = () => typeof window.ethereum !== 'undefined';
export const onRightChain = () => wallet.chainId === NET.chainId;

async function refresh() {
  if (!hasMetaMask()) return;
  try {
    const [accounts, chain] = await Promise.all([ethereum.request({ method: 'eth_accounts' }), ethereum.request({ method: 'eth_chainId' })]);
    wallet.account = accounts[0] ? ethers.getAddress(accounts[0]) : null;
    wallet.chainId = parseInt(chain, 16);
  } catch { /* ignore */ }
  emit();
}
export function initWallet() {
  if (!hasMetaMask()) return;
  ethereum.on?.('accountsChanged', refresh);
  ethereum.on?.('chainChanged', refresh);
  refresh();
}
export async function switchChain() {
  const chainId = '0x' + NET.chainId.toString(16);
  try {
    await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
  } catch (e) {
    const unknown = e.code === 4902 || e?.data?.originalError?.code === 4902 || /unrecognized chain/i.test(e.message || '');
    if (!unknown) throw e;
    await ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId, chainName: NET.name, nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 }, rpcUrls: [NET.rpc], blockExplorerUrls: [NET.explorer] }] });
  }
  await refresh();
}
/** Connect MetaMask and move to BOT Chain (adds the network if it is missing). */
export async function connect() {
  if (!hasMetaMask()) throw Object.assign(new Error('MetaMask was not found'), { code: 'NO_METAMASK' });
  await ethereum.request({ method: 'eth_requestAccounts' });
  await refresh();
  if (!onRightChain()) await switchChain();
  return wallet.account;
}
export const userRejected = (e) => e?.code === 4001 || e?.code === 'ACTION_REJECTED' || e?.info?.error?.code === 4001;
export function txMessage(e) {
  if (e?.code === 'NO_METAMASK') return 'Install MetaMask to publish. Remix, edit, copy and download all work without it.';
  if (userRejected(e)) return 'Cancelled in MetaMask. Nothing was sent.';
  if (e?.code === 'UPLOAD') return 'Uploading the pack to IPFS failed. Try again.';
  if (e?.code === 'INSUFFICIENT_FUNDS' || /insufficient funds/i.test(e?.message)) return 'Not enough BOT for gas in this wallet.';
  return `Transaction failed: ${e?.shortMessage || e?.reason || e?.message || 'unknown error'}`;
}

// ---------- registry ----------
let reader, provider;
const rpc = () => (provider ||= new ethers.JsonRpcProvider(NET.rpc, NET.chainId, { staticNetwork: true }));
const readContract = () => (reader ||= new ethers.Contract(CONTRACT, ABI, rpc()));
const plain = (p, id) => ({ id, owner: p.owner, title: p.title, sourceHash: p.sourceHash, packHash: p.packHash, cid: p.cid, formats: Number(p.formats), posted: Number(p.posted), at: Number(p[7]) });
const previewList = () => store.get(`${K}.registry`, []);
const signerContract = async () => new ethers.Contract(CONTRACT, ABI, await new ethers.BrowserProvider(ethereum).getSigner());

export const registry = {
  async total() { return LIVE ? Number(await readContract().total()) : previewList().length; },
  async postsLive() { return LIVE ? Number(await readContract().postsLive()) : previewList().reduce((n, p) => n + p.posted, 0); },
  async getPack(id) {
    if (!Number.isInteger(id) || id < 0) return null;
    if (!LIVE) { const p = previewList()[id]; return p ? { ...p, id } : null; }
    try { return plain(await readContract().getPack(id), id); }
    catch (e) { if (/NoSuchPack|revert|CALL_EXCEPTION/i.test(e.code + e.message)) return null; throw e; }
  },
  /** Newest first. */
  async recent(count = 6) {
    const total = await this.total();
    const from = Math.max(0, total - count);
    if (total <= from) return { total, items: [] };
    const items = LIVE ? (await readContract().getPacks(from, total - from)).map((p, i) => plain(p, from + i)) : previewList().slice(from, total).map((p, i) => ({ ...p, id: from + i }));
    return { total, items: items.reverse() };
  },
  /** { formatIndex: url } for a pack, newest link per format. */
  async postedLinks(id) {
    if (!LIVE) return { ...(previewList()[id]?.links || {}) };
    const c = readContract();
    const logs = await c.queryFilter(c.filters.Posted(id), NET.deployBlock || 0, 'latest');
    const out = {};
    for (const l of logs) out[Number(l.args.formatIndex)] = l.args.url;
    return out;
  },
  /** Returns { id, tx }. In preview mode nothing is sent to the chain. */
  async publish({ title, sourceHash, packHash, cid, formats }, onTx) {
    if (!LIVE) {
      const l = previewList();
      l.push({ owner: wallet.account || 'preview', title, sourceHash, packHash, cid, formats, posted: 0, at: Math.floor(Date.now() / 1000), links: {} });
      if (!store.set(`${K}.registry`, l)) throw new Error('This browser blocked local storage');
      return { id: l.length - 1, tx: null };
    }
    const c = await signerContract();
    const tx = await c.publish(title, sourceHash, packHash, cid, formats);
    onTx?.(tx.hash);
    const rc = await tx.wait();
    if (rc.status !== 1) throw new Error('The transaction failed on-chain');
    const log = rc.logs.map((l) => { try { return c.interface.parseLog(l); } catch { return null; } }).find((l) => l?.name === 'Published');
    return { id: log ? Number(log.args.id) : Number(await c.total()) - 1, tx: tx.hash };
  },
  async markPosted(id, formatIndex, url, onTx) {
    if (!LIVE) {
      const l = previewList();
      const p = l[id];
      if (!p) throw new Error('Pack not found');
      p.links ||= {};
      if (!p.links[formatIndex]) p.posted += 1;
      p.links[formatIndex] = url;
      store.set(`${K}.registry`, l);
      return { tx: null };
    }
    const c = await signerContract();
    const tx = await c.markPosted(id, formatIndex, url);
    onTx?.(tx.hash);
    const rc = await tx.wait();
    if (rc.status !== 1) throw new Error('The transaction failed on-chain');
    return { tx: tx.hash };
  },
};

// ---------- pack data (IPFS + a local copy) ----------
export const hashOf = (text) => ethers.keccak256(ethers.toUtf8Bytes(text));
/** Serialises the pack, keeps a local copy, and pins it to IPFS through the Worker when one is configured. */
export async function storePack(pack) {
  const json = canonical(pack);
  const packHash = hashOf(json);
  store.set(`${K}.data.${packHash}`, json);
  let cid = '';
  if (CONFIG.worker) {
    let res;
    try {
      res = await fetch(CONFIG.worker.replace(/\/$/, '') + '/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `remixly-${packHash.slice(2, 10)}.json`, content: json }) });
    } catch { throw Object.assign(new Error('IPFS upload failed'), { code: 'UPLOAD' }); }
    if (!res.ok) throw Object.assign(new Error('IPFS upload failed'), { code: 'UPLOAD' });
    cid = String((await res.json()).cid || '');
    if (!cid) throw Object.assign(new Error('IPFS upload failed'), { code: 'UPLOAD' });
  }
  return { packHash, cid, json };
}
/** Loads the pack JSON for a registry entry: local copy first, then IPFS. Returns { pack, verified } or null. */
export async function loadPackData(entry) {
  const local = store.get(`${K}.data.${entry.packHash}`, null);
  if (typeof local === 'string') { try { return { pack: JSON.parse(local), verified: hashOf(local) === entry.packHash }; } catch { /* fall through */ } }
  if (!entry.cid) return null;
  try {
    const res = await fetch(CONFIG.ipfsGateway + encodeURIComponent(entry.cid), { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const text = await res.text();
    return { pack: JSON.parse(text), verified: hashOf(text) === entry.packHash };
  } catch { return null; }
}
