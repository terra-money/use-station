import { DisplayCoin, Filter, Point } from '..'

export type ChartKey =
  | 'TxVolume'
  | 'StakingReturn'
  | 'TaxRewards'
  | 'TotalAccounts'

export enum CumulativeType {
  C = 'cumulative',
  P = 'periodic'
}

export interface ChartCard {
  title: string
  desc: string
  filter: {
    type?: Filter<CumulativeType>
    denom?: Filter
    duration: Filter
  }
  value?: DisplayCoin | [string, string]
  chart?: ChartUI
}

export interface ChartUI {
  data: Point[]
  tooltips: { title: string; label: string }[]
}
