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
