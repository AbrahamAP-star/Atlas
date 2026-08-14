# User Guide — Abraham's Funding Platform

This guide is for using the platform with no technical background. If anything doesn't work as described here, contact Abraham.

## Current state: testnet (Sepolia), not the final network
This guide describes the platform **as it works today, on the Sepolia test network** — not the final production version. Until deployed to the final network (Base, see `04_STATUS.md`), the ETH used here **has no real value** — it's only for testing that everything works before real money moves. Once the final deploy exists, this guide will be updated with the real contract address and links.

## What this is, in one sentence
A platform for creating crowdfunding campaigns where contributed money is held in a smart contract (public blockchain code), not a bank account or a person's control — nobody, not even the team who built it, can touch those funds except according to rules fixed in advance (see "How this protects your money" below).

## Before you start
1. **Install a wallet.** [MetaMask](https://metamask.io) recommended (browser extension or mobile app), free, where you hold ETH and sign transactions.
2. **Get test ETH (Sepolia).** While on the test network, the ETH you need is free from a faucet (e.g. `sepoliafaucet.com` or Google Cloud's official Sepolia faucet). Never use real money for this.
3. **Set MetaMask to the Sepolia network.** MetaMask already includes Sepolia among its test networks (enable "show test networks" in Settings → Advanced if not visible).

## 1. Connect your wallet
Find the **"Connect wallet"** button at the top of the site. MetaMask will ask you to confirm the connection — check the site is correct and accept. If your wallet is on a different network than Sepolia, the site will warn you and ask you to switch.

## 2. Create a project (campaign)
1. Click **"+ New project"**.
2. Fill in: title, description, an optional image, and an optional attached document (PDF or text — e.g. a business plan).
3. Set the **goal** in ETH: the minimum amount you need to raise before you can withdraw funds.
4. Confirm the transaction in your wallet. This has a small "gas" cost (the network fee, not a platform charge) — free on Sepolia since test ETH has no real value.

**Important:** this project **has no deadline**. It keeps accepting contributions indefinitely, even after reaching the goal, until you decide to withdraw funds ("Claim funds"). See the warnings section below for what this means in practice.

## 3. Contribute to a project (pledge)
1. Open the project's detail page.
2. Enter the ETH amount you want to contribute and confirm in your wallet.
3. Your contribution is recorded on the contract — watch the goal progress bar update on the project's page.

## 4. Withdraw funds as a creator (Claim funds)
The **"Claim funds"** button only appears if: you're the project's creator, the goal was reached (or exceeded), and you haven't already withdrawn. On confirming, the full raised amount transfers to your wallet in one transaction. Once you withdraw, the project closes: no new contributions accepted.

## 5. Request a refund (Request refund)
If you contributed and change your mind, you can request a refund **at any time**, as long as the creator hasn't withdrawn funds yet (no need to wait for the campaign to "fail" — it's your decision). The **"Request refund"** button appears automatically on a project's detail page if you have an active contribution there.

## 6. Delete a project (Delete project)
As a creator, you can delete your own project if: nobody has contributed anything yet, OR you already withdrew funds (`Claim funds` already done). If there are unclaimed contributions, the platform **does not allow** deletion — guaranteeing nobody loses the chance to request a refund.

## How this protects your money
The contract holds the funds, not a person or company — neither Abraham nor Claudio can move, freeze, or withdraw another project's money. There's always an exit: as long as funds aren't claimed, anyone who contributed can request a refund whenever they want. Everything is publicly recorded on the blockchain — anyone can independently verify a project's contributions and withdrawals.

## Important warnings (read before using real money)
- **This contract has no "pause button" and no way to reverse a transaction.** A deliberate security decision (so nobody, not even the team, can lock the funds), but it also means that if a critical bug is ever found after launching on the final network, there's no way to "freeze" the contract while it's fixed — the only real protection is requesting your own refund in time. The site shows this warning on the create-project and pledge forms.
- **No deadline.** A project stays alive indefinitely until the creator withdraws funds. If you contributed to a project and a long time passed with no new activity, the site will show a notice — but the refund is always available whether or not that notice appears.
- **Transactions are irreversible.** Once confirmed in your wallet, an operation can't be undone. Double-check amounts before confirming.

## Where to get help?
Contact Abraham through the already-agreed channel. If the issue involves a specific transaction, having the transaction "hash" on hand (shown on screen after confirming) helps diagnose it much faster.
