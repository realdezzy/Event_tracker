import { createPublicClient, http } from 'viem'
import { mainnet, bsc, arbitrum, polygon, fantom, optimism } from 'viem/chains'

const RPC_ETH = process.env.RPC_ETH
const RPC_BSC = process.env.RPC_BSC
const RPC_FTM = process.env.RPC_FTM
const RPC_ARB = process.env.RPC_ARB
const RPC_OPTI = process.env.RPC_OPTI
const RPC_POLY = process.env.RPC_POLY

export const publicClientETH = createPublicClient({
  chain: mainnet,
  transport: http(RPC_ETH)
})
export const publicClientBSC = createPublicClient({
  chain: bsc,
  transport: http(RPC_BSC)
})
export const publicClientARBITRUM = createPublicClient({
  chain: arbitrum,
  transport: http(RPC_ARB)
})
export const publicClientPOLYGON = createPublicClient({
  chain: polygon,
  transport: http(RPC_POLY)
})
export const publicClientFTM = createPublicClient({
  chain: fantom,
  transport: http(RPC_FTM)
})

export const publicClientOPTIMISM = createPublicClient({
  chain: optimism,
  transport: http(RPC_OPTI)
})