import { Dictionary } from 'ramda'

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

export interface ListedItem {
  symbol: string
  token: string
  icon?: string
}

export type Whitelist = Dictionary<ListedItem>

export type Pair = [string, string]
export type Pairs = Dictionary<Pair>
