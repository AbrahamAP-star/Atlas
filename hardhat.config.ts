import { defineConfig, configVariable } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

// Hardhat 3: cada plugin debe importarse Y añadirse a plugins[] (a diferencia de HH2,
// donde el import solo ya lo registraba).
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
    // Red local efímera para tests (por defecto, no requiere config)
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    // Base Sepolia (testnet) — Fase 3 del plan
    baseSepolia: {
      type: "http",
      chainType: "op", // Base es una L2 OP Stack
      url: configVariable("BASE_SEPOLIA_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
    // Base mainnet — Fase 6 del plan (deploy final)
    base: {
      type: "http",
      chainType: "op",
      url: configVariable("BASE_MAINNET_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },
  paths: {
    tests: {
      nodejs: "test",
    },
  },
});
