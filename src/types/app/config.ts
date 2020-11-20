export interface Config {
  lang: LangConfig
  currency: CurrencyConfig
  chain: ChainConfig
}

export interface InitialConfigState {
  lang?: LangKey
  currency?: string
  chain: ChainOptions
}

/* lang */
export type LangKey = 'en' | 'zh' | 'fr' | 'ko'

export interface LangConfig {
  current?: LangKey
  list: LangKey[]
  set: (key: LangKey) => void
}

/* currency */
export interface Currency {
  key: string
  value: string
  krwRate: string
}

export interface CurrencyConfig {
  current?: Currency
  list?: Currency[]
  loading: boolean
  set: (key: string) => void
}

/* chain */
export interface ChainOptions {
  name: string
  chainID: string
  lcd: string
  fcd: string
  ws: string
}

export interface ChainConfig {
  current: ChainOptions
  set: (options: ChainOptions) => void
}

/* socket */
export interface Socket {
  block?: Block
  status?: string
}

export interface Block {
  formatted: string
  link: string
}
