import hre from "hardhat";
import { writeFileSync, mkdirSync } from "node:fs";
import { existsSync } from "node:fs";

import CrowdfundingModule from "../ignition/modules/Crowdfunding.js";

/**
 * Deploy script for the Crowdfunding contract.
 *
 * Network is selected the standard Hardhat way, via the --network flag:
 *   npx hardhat run scripts/deploy.ts --network baseSepolia
 *   npx hardhat run scripts/deploy.ts --network base
 *
 * This wraps Hardhat Ignition (see ignition/modules/Crowdfunding.ts) instead
 * of sending a raw deployment transaction by hand, so we get:
 * - Idempotent deploys: re-running against the same network AND the same
 *   deploymentId won't redeploy an already-deployed contract (Ignition
 *   tracks state under ignition/deployments/<deploymentId>/, keyed by
 *   chain id when no explicit id is given).
 * - Automatic gas bumping / recovery if a deploy transaction gets stuck or
 *   dropped, which is realistic on a public testnet.
 *
 * IMPORTANT — idempotency and contract changes:
 * Ignition decides whether to redeploy by looking at the deploymentId's
 * journal, NOT the current bytecode of Crowdfunding.sol. If you changed the
 * contract (e.g. `durationSeconds` was removed from createProject) and you
 * run this script against a network that already has a COMPLETE deployment
 * for the same id, Ignition does NOT resend any transaction: it just returns
 * the old address as if it succeeded, leaving the frontend (new ABI) pointing
 * at old bytecode (bug diagnosed on 2026-07-13, see 04_STATUS.md). To force a
 * real redeploy after a contract change, pass a new journal id via
 * environment variable:
 *
 *   IGNITION_DEPLOYMENT_ID=sepolia-v2 npx hardhat run scripts/deploy.ts --network sepolia
 *
 * NOTE (2026-07-13): this variable is called IGNITION_DEPLOYMENT_ID and NOT
 * DEPLOYMENT_ID on purpose. `DEPLOYMENT_ID` collides with an internal signal
 * that hardhat-utils uses to detect CI environments (`isCi()` in
 * @nomicfoundation/hardhat-utils/dist/src/ci.js, meant for Vercel Now),
 * which makes hardhat-keystore skip configVariable resolution entirely and
 * fail with HHE7 even though the value exists in the keystore. See
 * 04_STATUS.md § "DEPLOYMENT_ID vs isCi() bug" for the full diagnosis.
 *
 * This creates ignition/deployments/sepolia-v2/ as a new journal, independent
 * from the old one (which stays intact as history, as Hardhat recommends
 * versioning that folder). Without the variable, Ignition's default id is
 * used (one per chain id) — correct for the normal case of "rerun the script
 * without having changed the contract".
 *
 * After deploying, we persist { address, network, deployedAt } into
 * deployments/<network>.json so the frontend (Phase 4/5) has a single place
 * to read the current contract address from, instead of hardcoding it.
 */
async function main(): Promise<void> {
  const connection = await hre.network.create();

  const deploymentId = process.env.IGNITION_DEPLOYMENT_ID;

  const { crowdfunding } = await connection.ignition.deploy(
    CrowdfundingModule,
    deploymentId ? { deploymentId } : undefined,
  );

  const address = crowdfunding.address;
  const networkName = connection.networkName;

  console.log(`Crowdfunding deployed to: ${address}`);
  console.log(`Network: ${networkName}`);

  const outputDir = "deployments";
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir);
  }

  const deploymentInfo = {
    address,
    network: networkName,
    deployedAt: new Date().toISOString(),
  };

  writeFileSync(
    `${outputDir}/${networkName}.json`,
    JSON.stringify(deploymentInfo, null, 2),
  );

  console.log(`Deployment info written to ${outputDir}/${networkName}.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
