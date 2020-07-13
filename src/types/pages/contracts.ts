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
}
