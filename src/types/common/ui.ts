import { API, Options } from '..'

export interface Card {
  title?: string
  content?: string
  i18nKey?: string
  button?: string
  cancel?: string
}

export interface Article {
  title: string
  content: string
}

export interface Tooltip {
  label: string
  text: string
}

export interface Filter<T = string> {
  value: string
  set: (v: T) => void
  options: Options
}

/* tx */
export interface Hash {
  text: string
  link: string
}

/* finder */
export interface FinderParams {
  network?: string
  q: string
  v: string
}

export type FinderFunction = (params: FinderParams) => string

/* chart */
export interface Point {
  t: Date
  y: number
}

/* pagination */
export interface Pagination {
  totalCnt: number
  page: number
  limit: number
}

export interface TablePage<Data, Table> extends API<Data> {
  title: string
  ui?: TableUI<Table>
}

export interface TableUI<Table> {
  pagination: Pagination
  card?: Card
  table?: Table
}
