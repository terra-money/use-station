import { Pagination, API, Card } from '..'

export interface ContractsPage extends API<ContractsData> {
  ui?: ContractsUI
  create: { attrs: { children: string } }
  upload: { attrs: { children: string } }
}

export interface ContractsUI {
  pagination: Pagination
  card?: Card
  list?: ContractUI[]
  search?: { placeholder: string }
}

export interface ContractUI {
  address: string
  link?: string
  date: string
  code: { label: string; value: string }
  contract: { label: string; value: string }
  interact: string
  query: string
}

/* data */
export interface ContractsData extends Pagination {
  contracts: Contract[]
}

export interface Contract {
  owner: string
  code_id: string
  init_msg: string
  txhash: string
  timestamp: string
  contract_address: string
  info: Info
  code: {
    code_id: string
    sender: string
    timestamp: string
    txhash: string
    info: Info
  }
}

export interface Info {
  name: string
  description: string
  memo: string
}
