import { Dictionary } from 'ramda'
import { Token } from '../pages/assets'

export type Denom = 'ukrw' | 'umnt' | 'usdr' | 'uusd'

export interface Coin {
  amount: string
  denom: string
}

export interface DisplayCoin {
  value: string
  unit: string
}

export type DisplayCoinDictionary = Dictionary<DisplayCoin>
export type Whitelist = Dictionary<Token>
export type Pair = [string, string]
export type Pairs = Dictionary<Pair>
