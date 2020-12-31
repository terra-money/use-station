import axios from 'axios'
import { Dictionary } from 'ramda'
import { ChainOptions, Denom } from '../types'

const PAIRS: Dictionary<Record<Denom, string>> = {
  mainnet: {
    ukrw: 'terra1zw0kfxrxgrs5l087mjm79hcmj3y8z6tljuhpmc',
    umnt: 'terra1sndgzq62wp23mv20ndr4sxg6k8xcsudsy87uph',
    usdr: 'terra1vs2vuks65rq7xj78mwtvn7vvnm2gn7adjlr002',
    uusd: 'terra1tndcaqxkpc5ce9qee5ggqf430mr2z3pefe5wj6'
  },

  testnet: {
    ukrw: 'terra1rfzwcdhhu502xws6r5pxw4hx8c6vms772d6vyu',
    umnt: 'terra18x2ld35r4vn5rlygjzpjenyh2rfmvqgqk9lrnn',
    usdr: 'terra1dmrn07plsrr8p7qqq6dmue8ydw0smxfza6f8sc',
    uusd: 'terra156v8s539wtz0sjpn8y8a8lfg8fhmwa7fy22aff'
  }
}

interface Params {
  pair: Denom // pair
  offer: { amount: string; denom: Denom }
}

export const getTerraswapURL = (
  { pair, offer }: Params,
  { name, lcd: baseURL }: ChainOptions
) => {
  const pairAddress = PAIRS[name][pair]
  const path = `/wasm/contracts/${pairAddress}/store`
  const offerMessage = {
    offer_asset: {
      amount: offer.amount,
      info: { native_token: { denom: offer.denom } }
    }
  }

  const params = { query_msg: { simulation: offerMessage } }

  return {
    query: { baseURL, path, params },
    url: `/wasm/contracts/${pairAddress}`,
    payload: {
      exec_msg: JSON.stringify({ swap: offerMessage }),
      coins: [offer]
    }
  }
}

interface SimulationResult {
  return_amount: string
  spread_amount: string
  commission_amount: string
}

export const simulate = async (params: Params, chain: ChainOptions) => {
  try {
    const { query } = getTerraswapURL(params, chain)
    const { path, ...config } = query
    const { data } = await axios.get<{ result: SimulationResult }>(path, config)
    return { success: true, result: data.result }
  } catch (error) {
    return { success: false, message: error.message }
  }
}
