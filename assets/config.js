// The one place to set contract addresses, the Worker URL and links.
// Leave a contract empty to run in preview mode (a simulated registry saved in this browser).
export const MAINNET_CONTRACT_ADDRESS = '0x5cA0ba90354Bc8855b626b629E054554903611B6'; // ← PackRegistry on BOT Chain mainnet (also in README + footer)
export const TESTNET_CONTRACT_ADDRESS = ''; // ← used with ?net=testnet
// Block the contract was deployed in (speeds up reading Posted events). 0 = search from genesis.
export const MAINNET_DEPLOY_BLOCK = 30490125;
export const TESTNET_DEPLOY_BLOCK = 0;

export const CONFIG = {
  networks: {
    mainnet: { chainId: 677, name: 'BOT Chain', rpc: 'https://rpc.botchain.ai', explorer: 'https://scan.botchain.ai', contract: MAINNET_CONTRACT_ADDRESS, deployBlock: MAINNET_DEPLOY_BLOCK },
    testnet: { chainId: 968, name: 'BOT Chain Testnet', rpc: 'https://rpc.bohr.life', explorer: 'https://scan.bohr.life', contract: TESTNET_CONTRACT_ADDRESS, deployBlock: TESTNET_DEPLOY_BLOCK },
  },
  // Cloudflare Worker with /remix/extract, /remix/create, /remix/tweak and /upload (see worker/).
  // Empty → formats come from the built-in offline remix (rule-based, no AI), links can't be read, and packs are not pinned to IPFS.
  worker: 'https://remixly-worker.inkprint-worker.workers.dev',
  ipfsGateway: 'https://ipfs.io/ipfs/',
  links: {
    botchain: 'https://botchain.ai',
    docs: 'https://docs.botchain.ai',
    faucet: 'https://faucet.bohr.life',
    telegram: 'https://t.me/botchain_ai',
    email: 'mailto:hello@remixly.xyz',
    // Optional 30s screen recording for the "Watch reel" modal. Empty → the modal plays the live app demo (/app?demo).
    reel: '',
  },
  storageKey: 'remixly',
};
