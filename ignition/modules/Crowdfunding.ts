import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Ignition module for the Crowdfunding contract.
 *
 * Why Ignition instead of a plain imperative script:
 * - Deployments are declarative and idempotent: re-running this module against
 *   the same network/deployment id will NOT redeploy the contract if it was
 *   already deployed (Ignition tracks state under ignition/deployments/).
 * - Automatic gas bumping and recovery from dropped/stuck transactions, which
 *   matters on a public testnet/mainnet more than on a local node.
 * - It's the deployment system bundled with @nomicfoundation/hardhat-toolbox-viem
 *   (already a project dependency), so no extra tooling is introduced.
 *
 * Crowdfunding has no constructor arguments (see contracts/Crowdfunding.sol),
 * so this module is intentionally minimal: just declare the contract to deploy.
 */
export default buildModule("CrowdfundingModule", (m) => {
  const crowdfunding = m.contract("Crowdfunding");

  return { crowdfunding };
});
