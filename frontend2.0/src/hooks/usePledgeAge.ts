import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import type { Address, Log } from "viem";
import { crowdfundingAbi } from "@/contracts/crowdfundingConfig";
import { useNetworkStatus } from "./useNetworkStatus";

// docs/09_ROADMAP_MEJORAS.md § 14, Option A (decided by Abraham/Claudio,
// 2026-08-04): compute time elapsed since a project's most recent `Pledged`
// event, to power a purely informational "no recent activity" banner
// (lib/pledgeAgeBanner.ts). Deliberately scoped to the detail view only
// (this file), never the listing — reading event logs is much heavier than
// the multicall struct reads useProjects.ts already does, and the roadmap
// explicitly calls that out as a cost to avoid on the listing.

// Bounds a single query to a fixed lookback window instead of scanning from
// the genesis block. Two reasons, not one:
//   1. Some RPC providers (Alchemy/Infura free tiers, some public endpoints)
//      reject/truncate eth_getLogs calls past a certain block-range size.
//   2. A project that hasn't been pledged to in >60 days is already well
//      past STALE_PLEDGE_THRESHOLD_DAYS (30) either way — scanning further
//      back than this cannot change whether the banner should show.
// 60 days is a deliberately generous margin over the 30-day threshold, not a
// hard technical limit; if a network's block time changes a lot this is the
// one constant to revisit.
const LOOKBACK_DAYS = 60;
// ~12s/block average across the testnets this project targets (Sepolia L1;
// Base Sepolia is faster, so this only makes the window *more* generous
// there, never less). Approximate on purpose: this only sizes the query
// window, it never feeds into the actual "days since" calculation, which
// always uses the real block timestamp returned by the RPC.
const APPROX_SECONDS_PER_BLOCK = 12;
const LOOKBACK_BLOCKS = BigInt(
  Math.floor((LOOKBACK_DAYS * 24 * 60 * 60) / APPROX_SECONDS_PER_BLOCK),
);
// Conservative range per eth_getLogs call — some free-tier RPCs cap this
// well below what Sepolia's own node would allow. Only used as a fallback
// when the single wide-range request above gets rejected.
const CHUNK_SIZE_BLOCKS = 10_000n;

export interface PledgeAgeResult {
  /** Unix ms timestamp of the most recent Pledged event for this project.
   *  undefined = no pledges yet, or the logs couldn't be read (never thrown
   *  to the caller — this feature is informational, not load-bearing). */
  lastPledgedAt: number | undefined;
  daysSinceLastPledge: number | undefined;
  isLoading: boolean;
}

type PledgedLog = Log<
  bigint,
  number,
  false,
  undefined,
  true,
  typeof crowdfundingAbi,
  "Pledged"
>;

async function fetchPledgedLogs(
  client: NonNullable<ReturnType<typeof usePublicClient>>,
  address: Address,
  id: number,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<PledgedLog[]> {
  try {
    // Cheapest path: one request across the whole window.
    return await client.getContractEvents({
      address,
      abi: crowdfundingAbi,
      eventName: "Pledged",
      args: { id: BigInt(id) },
      fromBlock,
      toBlock,
    });
  } catch {
    // Fallback: walk backward in bounded chunks, stopping as soon as a
    // chunk has a hit — we only need the MOST RECENT pledge, not the
    // full history, so there is no reason to keep scanning past that.
    const results: PledgedLog[] = [];
    let chunkEnd = toBlock;
    while (chunkEnd > fromBlock) {
      const chunkStart =
        chunkEnd - CHUNK_SIZE_BLOCKS > fromBlock
          ? chunkEnd - CHUNK_SIZE_BLOCKS
          : fromBlock;
      const chunkLogs = await client.getContractEvents({
        address,
        abi: crowdfundingAbi,
        eventName: "Pledged",
        args: { id: BigInt(id) },
        fromBlock: chunkStart,
        toBlock: chunkEnd,
      });
      if (chunkLogs.length > 0) {
        results.push(...chunkLogs);
        break;
      }
      chunkEnd = chunkStart - 1n;
    }
    return results;
  }
}

export function usePledgeAge(id: number): PledgeAgeResult {
  const publicClient = usePublicClient();
  const { address, canInteract } = useNetworkStatus();

  const { data, isLoading } = useQuery({
    queryKey: ["pledge-age", address, id],
    // React Query treats `undefined` as "no data returned" (dev warning,
    // query never settles as a clean success) — `null` is the correct
    // sentinel for "legitimately no pledge found", converted back to
    // `undefined` below for this hook's own public API.
    queryFn: async (): Promise<number | null> => {
      const client = publicClient;
      if (!client || !address) return null;

      const latestBlock = await client.getBlockNumber();
      const fromBlock =
        latestBlock > LOOKBACK_BLOCKS ? latestBlock - LOOKBACK_BLOCKS : 0n;

      const logs = await fetchPledgedLogs(
        client,
        address,
        id,
        fromBlock,
        latestBlock,
      );
      if (logs.length === 0) return null;

      // Logs come back in ascending block order; the last one is the most recent pledge.
      const lastLog = logs[logs.length - 1];
      const block = await client.getBlock({
        blockNumber: lastLog.blockNumber!,
      });
      return Number(block.timestamp) * 1000;
    },
    // A read failure here must never surface as an error state to the user —
    // this banner is a nice-to-have, not a dependency of pledge/claim/refund.
    // React Query still logs failures internally for debugging; we just
    // don't retry aggressively against a possibly rate-limited public RPC.
    enabled: !!publicClient && !!address && canInteract,
    staleTime: 5 * 60 * 1000, // 5 min: informational, doesn't need second-accuracy
    retry: 1,
  });

  const lastPledgedAt = data ?? undefined;
  const daysSinceLastPledge =
    lastPledgedAt !== undefined
      ? Math.floor((Date.now() - lastPledgedAt) / (1000 * 60 * 60 * 24))
      : undefined;

  return { lastPledgedAt, daysSinceLastPledge, isLoading };
}
