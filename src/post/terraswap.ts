import { AccAddress } from '@terra-money/terra.js'
import axios from 'axios'
import { ChainOptions } from '../types'

interface Params {
  pair?: string
  token?: string
  offer: { amount: string; from: string }
}

export const getTerraswapURL = (
  { pair, token, offer }: Params,
  { lcd: baseURL }: ChainOptions
) => {
  const shouldHook = AccAddress.validate(offer.from)
  const simulatePath = `/wasm/contracts/${pair}/store`
  const url = `/wasm/contracts/${shouldHook ? token : pair}`

  const offerMessage = {
    offer_asset: {
      amount: offer.amount,
      info: AccAddress.validate(offer.from)
        ? { token: { contract_addr: offer.from } }
        : { native_token: { denom: offer.from } },
    },
  }

  const params = { query_msg: { simulation: offerMessage } }

  return {
    query: { baseURL, path: simulatePath, params },
    url,
    payload: {
      exec_msg: JSON.stringify(
        shouldHook
          ? {
              send: {
                amount: offer.amount,
                contract: pair,
                msg: toBase64({ swap: offerMessage }),
              },
            }
          : { swap: offerMessage }
      ),
      coins: AccAddress.validate(offer.from)
        ? []
        : [{ amount: offer.amount, denom: offer.from }],
    },
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

/* utils */
const toBase64 = (object: object) => {
  try {
    return Buffer.from(JSON.stringify(object)).toString('base64')
  } catch (error) {
    return ''
  }
}
