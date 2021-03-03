import { Coin } from '@terra-money/terra.js'
import axios from 'axios'
import { Dictionary } from 'ramda'
import { ChainOptions, Pairs } from '../types'
import { is } from '../utils'
import { toBase64, toTokenInfo } from './terraswap'

const RouteContracts: Dictionary<string> = {
  mainnet: 'terra19qx5xe6q9ll4w0890ux7lv2p4mf3csd4qvt3ex',
  testnet: 'terra1dtzpdj3lc7prd46tuxj2aqy40uv4v4xsphwcpx',
}

interface SwapParams {
  from: string
  to: string
}

export const isOnChainAvailable = ({ from, to }: SwapParams) =>
  is.nativeDenom(from) && is.nativeTerra(to)

export const findPair = ({ from, to }: SwapParams, pairs?: Pairs) => {
  if (!pairs) return

  const shouldBurnLuna = from === 'uluna' && is.nativeTerra(from)
  const pair = Object.entries(pairs).find(([, tokens]) =>
    [from, to].every((token) => tokens.includes(token))
  )?.[0]

  return shouldBurnLuna ? undefined : pair
}

const createSwap = ({ from, to }: SwapParams) =>
  isOnChainAvailable({ from, to })
    ? { native_swap: { offer_denom: from, ask_denom: to } }
    : {
        terra_swap: {
          offer_asset_info: toTokenInfo(from),
          ask_asset_info: toTokenInfo(to),
        },
      }

const findRoute = ({ from, to }: SwapParams) => [
  createSwap({ from, to: 'uusd' }),
  createSwap({ from: 'uusd', to }),
]

interface SimulateParams extends SwapParams {
  amount: string
  chain: ChainOptions
}

export const isRouteAvailable = ({ name }: ChainOptions) => {
  return !!RouteContracts[name]
}

export const getRouteMessage = (params: SimulateParams) => {
  const { amount, from, to, chain } = params
  const offer_amount = amount
  const path = RouteContracts[chain.name]
  const operations = findRoute({ from, to })

  const msg = { execute_swap_operations: { offer_amount, operations } }
  const execute = is.nativeDenom(from)
    ? {
        contract: path,
        msg,
        coins: [new Coin(from, offer_amount)],
      }
    : {
        contract: from,
        msg: { send: { contract: path, msg: toBase64(msg), amount } },
      }

  return {
    simulate: {
      path,
      msg: { simulate_swap_operations: { offer_amount, operations } },
    },
    execute,
  }
}

export const simulateRoute = async (params: SimulateParams) => {
  const { chain } = params
  const { simulate } = getRouteMessage(params)
  const path = `/wasm/contracts/${simulate.path}/store`
  const config = { baseURL: chain.lcd, params: { query_msg: simulate.msg } }
  const { data } = await axios.get<{ result: { amount: string } }>(path, config)
  return data.result.amount
}

export default findRoute
