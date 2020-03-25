export interface Config {
  lang: LangConfig
  chain: ChainConfig
}

export interface InitialConfigState {
  lang: LangKey
  chain: ChainKey
}

/* lang */
export type LangKey = 'en' | 'zh' | 'fr' | 'ko'
export type LangConfig = Configure<LangKey>

/* chain */
export type ChainKey = 'columbus' | 'vodka' | 'soju' | 'fitz' | 'mars'
export type ChainConfig = Configure<ChainKey>

/* socket */
export interface Socket {
  block?: Block
  status?: string
}

export interface Block {
  formatted: string
  link: string
}

/* utils */
export interface Configure<T> {
  current?: T
  list: T[]
  set: (key: T) => void
}
