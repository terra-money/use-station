import { Pagination, API, Coin, Card } from '..'

export type TxType =
  | ''
  | 'send'
  | 'receive'
  | 'staking'
  | 'market'
  | 'governance'
  | 'contract'

export interface TxsPage extends API<TxsData> {
  ui?: TxsUI
}

export interface TxsUI {
  pagination: Pagination
  card?: Card
  list?: TxUI[]
}

export interface TxUI {
  link: string
  hash: string
  date: string
  messages: MessageUI[]
  details: Card[]
}

export interface MessageUI {
  tag: string
  text: string
  success: boolean
}

/* data */
export interface TxsData extends Pagination {
  txs: Tx[]
}

export interface Tx {
  timestamp: string
  txhash: string
  msgs: Message[]
  txFee: Coin[]
  memo: string
  success: boolean
  errorMessage: string
  chainId: string
}

export interface Message {
  tag: string
  text: string
  out?: Coin[]
}
