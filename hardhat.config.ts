import { defineConfig, configVariable } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

// Hardhat 3: every plugin must be imported AND added to plugins[] (unlike HH2,
// where the import alone was enough to register it).
export default defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Ephemeral local network for tests (default, no config required)
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    // Base Sepolia (testnet) — Phase 3 of the plan
    baseSepolia: {
      type: "http",
      chainType: "op", // Base is an OP Stack L2
      url: configVariable("BASE_SEPOLIA_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
    // Base mainnet — Phase 6 of the plan (final deploy)
    base: {
      type: "http",
      chainType: "op",
      url: configVariable("BASE_MAINNET_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
    // Ethereum Sepolia (L1 testnet) — support added at Abraham's request,
    // used via an Infura node. chainType "l1" (not "op": Sepolia isn't an
    // OP Stack L2, it's the Ethereum mainnet testnet). DEPLOYER_PRIVATE_KEY
    // is reused (same deploy account for all networks) and BASESCAN_API_KEY
    // works here too because Etherscan V2 is multichain (same reason as Base).
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
    // Local Anvil node (Foundry) — used only by E2E tests (see
    // scripts/e2e-setup.ts, frontend2.0/e2e/, docs/09_ROADMAP_MEJORAS.md §12).
    // Never used for a real deploy: Anvil resets its whole chain state every
    // time it starts, so this network exists purely to deploy a fresh
    // Crowdfunding instance for a local E2E run.
    //
    // The private keys below are NOT secrets: they're Anvil's well-known
    // default test accounts (derived from the public test mnemonic "test
    // test test ... junk", documented at book.getfoundry.sh/reference/anvil)
    // — hardcoding them (instead of configVariable/keystore) is intentional
    // and safe. NEVER reuse these keys or this pattern for a real network.
    anvil: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Anvil account #0 (deployer)
      ],
    },
  },
  paths: {
    tests: {
      nodejs: "test",
    },
  },
  // Phase 3: source code verification on the block explorer (Basescan).
  // Basescan uses Etherscan's multichain API (Etherscan V2): the same
  // BASESCAN_API_KEY works for Base and Base Sepolia via chainid, no need
  // for a different key per network.
  // Source: hardhat-verify README (@nomicfoundation/hardhat-verify 5.0.5,
  // package bundled with hardhat-toolbox-viem).
  verify: {
    etherscan: {
      apiKey: configVariable("BASESCAN_API_KEY"),
    },
    // Blockscout/Sourcify come enabled by default in hardhat-verify, but this
    // project only uses Etherscan/Basescan (see 03_PLAN_FASES.md). Without
    // this, `verify` tries all 3 providers and fails on the other two due to
    // network issues unrelated to the project (Blockscout DNS, Sourcify
    // RPC), even though Etherscan verified successfully.
    blockscout: { enabled: false },
    sourcify: { enabled: false },
  },
});
