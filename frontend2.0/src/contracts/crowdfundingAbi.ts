// ABI extracted from artifacts/contracts/Crowdfunding.sol/Crowdfunding.json.
// Copied 1:1 from frontend/src/contracts/crowdfundingAbi.ts (migration to
// frontend2.0, docs/08_FRONTEND_MIGRATION.md) - it's a data array, not
// logic, requires no changes to work here.
// Updated after removing the deadline/duration concept (see 04_STATUS.md):
// createProject no longer receives `durationSeconds`, ProjectCreated no
// longer emits `deadline`, `isExpired` doesn't exist, and the error
// `ProjectClosed` was added.
// `as const` lets viem/wagmi infer exact types for args and outputs.
export const crowdfundingAbi = [
  { inputs: [{ internalType: "uint256", name: "id", type: "uint256" }], name: "AlreadyClaimed", type: "error" },
  { inputs: [], name: "InvalidGoal", type: "error" },
  { inputs: [{ internalType: "uint256", name: "id", type: "uint256" }], name: "NoFundsToRefund", type: "error" },
  { inputs: [{ internalType: "uint256", name: "id", type: "uint256" }], name: "NotProjectCreator", type: "error" },
  { inputs: [{ internalType: "uint256", name: "id", type: "uint256" }], name: "ProjectClosed", type: "error" },
  { inputs: [{ internalType: "uint256", name: "id", type: "uint256" }], name: "ProjectHasActiveFunds", type: "error" },
  { inputs: [{ internalType: "uint256", name: "id", type: "uint256" }], name: "ProjectNotFound", type: "error" },
  { inputs: [{ internalType: "uint256", name: "id", type: "uint256" }], name: "ProjectNotSuccessful", type: "error" },
  { inputs: [], name: "ReentrancyGuardReentrantCall", type: "error" },
  {
    inputs: [
      { internalType: "uint8", name: "bits", type: "uint8" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "SafeCastOverflowedUintDowncast",
    type: "error",
  },
  { inputs: [], name: "TransferFailed", type: "error" },
  { inputs: [], name: "ZeroPledge", type: "error" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "id", type: "uint256" },
      { indexed: false, internalType: "uint96", name: "amount", type: "uint96" },
    ],
    name: "FundsClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "id", type: "uint256" },
      { indexed: true, internalType: "address", name: "backer", type: "address" },
      { indexed: false, internalType: "uint96", name: "amount", type: "uint96" },
    ],
    name: "Pledged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "uint256", name: "id", type: "uint256" }],
    name: "ProjectDeleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "id", type: "uint256" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "uint96", name: "goal", type: "uint96" },
    ],
    name: "ProjectCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "id", type: "uint256" },
      { indexed: true, internalType: "address", name: "backer", type: "address" },
      { indexed: false, internalType: "uint96", name: "amount", type: "uint96" },
    ],
    name: "Refunded",
    type: "event",
  },
  {
    inputs: [{ internalType: "uint256", name: "id", type: "uint256" }],
    name: "claimFunds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint96", name: "goal", type: "uint96" },
      { internalType: "string", name: "metadataCID", type: "string" },
    ],
    name: "createProject",
    outputs: [{ internalType: "uint256", name: "id", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "id", type: "uint256" }],
    name: "deleteProject",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "id", type: "uint256" }],
    name: "getProject",
    outputs: [
      {
        components: [
          { internalType: "address payable", name: "creator", type: "address" },
          { internalType: "uint96", name: "goal", type: "uint96" },
          { internalType: "uint96", name: "pledged", type: "uint96" },
          { internalType: "bool", name: "claimed", type: "bool" },
          { internalType: "string", name: "metadataCID", type: "string" },
        ],
        internalType: "struct Crowdfunding.Project",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "id", type: "uint256" }],
    name: "isSuccessful",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextProjectId",
    outputs: [{ internalType: "uint32", name: "", type: "uint32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "id", type: "uint256" }],
    name: "pledge",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "id", type: "uint256" },
      { internalType: "address", name: "backer", type: "address" },
    ],
    name: "pledgeOf",
    outputs: [{ internalType: "uint96", name: "", type: "uint96" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "id", type: "uint256" }],
    name: "refund",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
