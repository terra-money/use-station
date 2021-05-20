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
export type LangKey = 'en' | 'es' | 'zh' | 'fr' | 'ko' | 'ru' | 'pl'

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
}

export interface ChainConfig {
  current: ChainOptions
  set: (options: ChainOptions) => void
}

export interface HeightData {
  formatted: string
  link: string
}
