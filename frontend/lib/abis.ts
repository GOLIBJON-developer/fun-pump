// Auto-generate via: cast abi-encode or copy from out/Factory.sol/Factory.json
// after running: forge build

export const FACTORY_ABI = [
  // Views
  {
    name: "totalTokens",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "fee",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getTokenSale",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_index", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "token",    type: "address" },
          { name: "name",     type: "string"  },
          { name: "imageURI", type: "string"  },
          { name: "creator",  type: "address" },
          { name: "sold",     type: "uint256" },
          { name: "raised",   type: "uint256" },
          { name: "isOpen",   type: "bool"    },
        ],
      },
    ],
  },
  {
    name: "tokenToSale",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "token",    type: "address" },
      { name: "name",     type: "string"  },
      { name: "imageURI", type: "string"  },
      { name: "creator",  type: "address" },
      { name: "sold",     type: "uint256" },
      { name: "raised",   type: "uint256" },
      { name: "isOpen",   type: "bool"    },
    ],
  },
  {
    name: "getTokensPaginated",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_offset", type: "uint256" },
      { name: "_limit",  type: "uint256" },
    ],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "token",    type: "address" },
          { name: "name",     type: "string"  },
          { name: "imageURI", type: "string"  },
          { name: "creator",  type: "address" },
          { name: "sold",     type: "uint256" },
          { name: "raised",   type: "uint256" },
          { name: "isOpen",   type: "bool"    },
        ],
      },
    ],
  },
  {
    name: "getCost",
    type: "function",
    stateMutability: "pure",
    inputs: [{ name: "_sold", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "estimateCost",
    type: "function",
    stateMutability: "pure",
    inputs: [
      { name: "_sold",   type: "uint256" },
      { name: "_amount", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  // Writes
  {
    name: "create",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "_name",        type: "string" },
      { name: "_symbol",      type: "string" },
      { name: "_imageURI",    type: "string" },
      { name: "_description", type: "string" },
    ],
    outputs: [{ name: "tokenAddr", type: "address" }],
  },
  {
    name: "buy",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "_token",  type: "address" },
      { name: "_amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_token", type: "address" }],
    outputs: [],
  },
  // Events
  {
    name: "TokenCreated",
    type: "event",
    inputs: [
      { name: "token",    type: "address", indexed: true  },
      { name: "creator",  type: "address", indexed: true  },
      { name: "name",     type: "string",  indexed: false },
      { name: "symbol",   type: "string",  indexed: false },
      { name: "imageURI", type: "string",  indexed: false },
      { name: "timestamp",type: "uint256", indexed: false },
    ],
  },
  {
    name: "TokenPurchased",
    type: "event",
    inputs: [
      { name: "token",       type: "address", indexed: true  },
      { name: "buyer",       type: "address", indexed: true  },
      { name: "amount",      type: "uint256", indexed: false },
      { name: "price",       type: "uint256", indexed: false },
      { name: "totalSold",   type: "uint256", indexed: false },
      { name: "totalRaised", type: "uint256", indexed: false },
    ],
  },
] as const;