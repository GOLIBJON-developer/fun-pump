export const FACTORY_ABI = [
  {
    type: "constructor",
    inputs: [{ name: "_fee", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  { type: "receive", stateMutability: "payable" },

  // ── View / Pure ───────────────────────────────────────────────
  {
    type: "function",
    name: "fee",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalTokens",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "TARGET",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "TOKEN_LIMIT",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "TOTAL_SUPPLY",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MIN_BUY",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_BUY",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "FLOOR",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "STEP",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "INCREMENT",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokens",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenToSale",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [
      { name: "token",     type: "address", internalType: "address" },
      { name: "name",      type: "string",  internalType: "string"  },
      { name: "imageURI",  type: "string",  internalType: "string"  },
      { name: "creator",   type: "address", internalType: "address" },
      { name: "sold",      type: "uint256", internalType: "uint256" },
      { name: "raised",    type: "uint256", internalType: "uint256" },
      { name: "isOpen",    type: "bool",    internalType: "bool"    },
      { name: "deposited", type: "bool",    internalType: "bool"    },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSale",
    inputs: [{ name: "_token", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct Factory.TokenSale",
        components: [
          { name: "token",     type: "address", internalType: "address" },
          { name: "name",      type: "string",  internalType: "string"  },
          { name: "imageURI",  type: "string",  internalType: "string"  },
          { name: "creator",   type: "address", internalType: "address" },
          { name: "sold",      type: "uint256", internalType: "uint256" },
          { name: "raised",    type: "uint256", internalType: "uint256" },
          { name: "isOpen",    type: "bool",    internalType: "bool"    },
          { name: "deposited", type: "bool",    internalType: "bool"    },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokenSale",
    inputs: [{ name: "_index", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct Factory.TokenSale",
        components: [
          { name: "token",     type: "address", internalType: "address" },
          { name: "name",      type: "string",  internalType: "string"  },
          { name: "imageURI",  type: "string",  internalType: "string"  },
          { name: "creator",   type: "address", internalType: "address" },
          { name: "sold",      type: "uint256", internalType: "uint256" },
          { name: "raised",    type: "uint256", internalType: "uint256" },
          { name: "isOpen",    type: "bool",    internalType: "bool"    },
          { name: "deposited", type: "bool",    internalType: "bool"    },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokensPaginated",
    inputs: [
      { name: "_offset", type: "uint256", internalType: "uint256" },
      { name: "_limit",  type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      {
        name: "result",
        type: "tuple[]",
        internalType: "struct Factory.TokenSale[]",
        components: [
          { name: "token",     type: "address", internalType: "address" },
          { name: "name",      type: "string",  internalType: "string"  },
          { name: "imageURI",  type: "string",  internalType: "string"  },
          { name: "creator",   type: "address", internalType: "address" },
          { name: "sold",      type: "uint256", internalType: "uint256" },
          { name: "raised",    type: "uint256", internalType: "uint256" },
          { name: "isOpen",    type: "bool",    internalType: "bool"    },
          { name: "deposited", type: "bool",    internalType: "bool"    },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAllTokens",
    inputs: [],
    outputs: [{ name: "", type: "address[]", internalType: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCost",
    inputs: [{ name: "_sold", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "estimateCost",
    inputs: [
      { name: "_sold",   type: "uint256", internalType: "uint256" },
      { name: "_amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "getSaleProgress",
    inputs: [{ name: "_token", type: "address", internalType: "address" }],
    outputs: [
      { name: "byRaised", type: "uint256", internalType: "uint256" },
      { name: "bySold",   type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },

  // ── Write ─────────────────────────────────────────────────────
  {
    type: "function",
    name: "create",
    inputs: [
      { name: "_name",        type: "string", internalType: "string" },
      { name: "_symbol",      type: "string", internalType: "string" },
      { name: "_imageURI",    type: "string", internalType: "string" },
      { name: "_description", type: "string", internalType: "string" },
    ],
    outputs: [{ name: "tokenAddr", type: "address", internalType: "address" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "buy",
    inputs: [
      { name: "_token",   type: "address", internalType: "address" },
      { name: "_amount",  type: "uint256", internalType: "uint256" },
      { name: "_maxCost", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "_token", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [{ name: "_amount", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "_newOwner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },

  // ── Events ────────────────────────────────────────────────────
  {
    type: "event",
    name: "TokenCreated",
    inputs: [
      { name: "token",     type: "address", indexed: true,  internalType: "address" },
      { name: "creator",   type: "address", indexed: true,  internalType: "address" },
      { name: "name",      type: "string",  indexed: false, internalType: "string"  },
      { name: "symbol",    type: "string",  indexed: false, internalType: "string"  },
      { name: "imageURI",  type: "string",  indexed: false, internalType: "string"  },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TokenPurchased",
    inputs: [
      { name: "token",       type: "address", indexed: true,  internalType: "address" },
      { name: "buyer",       type: "address", indexed: true,  internalType: "address" },
      { name: "amount",      type: "uint256", indexed: false, internalType: "uint256" },
      { name: "price",       type: "uint256", indexed: false, internalType: "uint256" },
      { name: "totalSold",   type: "uint256", indexed: false, internalType: "uint256" },
      { name: "totalRaised", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SaleClosed",
    inputs: [
      { name: "token",       type: "address", indexed: true,  internalType: "address" },
      { name: "totalRaised", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "totalSold",   type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TokenGraduated",
    inputs: [
      { name: "token",       type: "address", indexed: true,  internalType: "address" },
      { name: "creator",     type: "address", indexed: true,  internalType: "address" },
      { name: "ethAmount",   type: "uint256", indexed: false, internalType: "uint256" },
      { name: "tokenAmount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "owner",  type: "address", indexed: true,  internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      { name: "previousOwner", type: "address", indexed: true, internalType: "address" },
      { name: "newOwner",      type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },

  // ── Errors ────────────────────────────────────────────────────
  { type: "error", name: "Factory__AlreadyDeposited",  inputs: [] },
  { type: "error", name: "Factory__AmountExceeded",    inputs: [] },
  { type: "error", name: "Factory__AmountTooLow",      inputs: [] },
  { type: "error", name: "Factory__ETHTransferFailed", inputs: [] },
  { type: "error", name: "Factory__InsufficientETH",   inputs: [] },
  { type: "error", name: "Factory__InsufficientFee",   inputs: [] },
  { type: "error", name: "Factory__InvalidToken",      inputs: [] },
  { type: "error", name: "Factory__NotAuthorized",     inputs: [] },
  { type: "error", name: "Factory__NotOwner",          inputs: [] },
  { type: "error", name: "Factory__SaleClosed",        inputs: [] },
  { type: "error", name: "Factory__TargetNotReached",  inputs: [] },
  { type: "error", name: "Factory__ZeroAddress",       inputs: [] },
  {
    type: "error",
    name: "Factory__SlippageExceeded",
    inputs: [
      { name: "required",    type: "uint256", internalType: "uint256" },
      { name: "maxAllowed",  type: "uint256", internalType: "uint256" },
    ],
  },
  { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
  {
    type: "error",
    name: "SafeERC20FailedOperation",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
  },
] as const;

// ── TokenSale type (ABI dan olingan) ─────────────────────────────
export type TokenSale = {
  token:     `0x${string}`;
  name:      string;
  imageURI:  string;
  creator:   `0x${string}`;
  sold:      bigint;
  raised:    bigint;
  isOpen:    boolean;
  deposited: boolean;
};
