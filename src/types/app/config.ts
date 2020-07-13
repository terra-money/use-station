export interface Config {
  lang: LangConfig
  chain: ChainConfig
}

export interface InitialConfigState {
  lang?: LangKey
  chain: ChainOptions
}

/* lang */
export type LangKey = 'en' | 'zh' | 'fr' | 'ko'

export interface LangConfig {
  current?: LangKey
  list: LangKey[]
  set: (key: LangKey) => void
}

/* chain */
export interface ChainOptions {
  key: string
  name: string
  fcd?: string
  hostname: string
  port?: number
  secure?: boolean
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
