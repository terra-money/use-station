import { DisplayCoin, Card, BankAPI } from '..'

export interface AssetsPage extends BankAPI {
  address: Card
  viewAddress: string
  ui?: AssetsUI
}

export interface AssetsUI {
  card?: Card
  available?: AvailableUI
  vesting?: VestingUI
}

export interface AvailableUI {
  title: string
  list: { denom: string; display: DisplayCoin }[]
  hideSmall: { label: string; checked: boolean; toggle: () => void }
  send: string
}

export interface VestingUI {
  title: string
  desc: string
  list: VestingItemUI[]
}

export interface VestingItemUI {
  display: DisplayCoin
  schedule: ScheduleUI[]
}

export interface ScheduleUI {
  released: boolean
  releasing: boolean
  percent: string
  display: DisplayCoin
  status: string
  duration: string
  width: string
}
