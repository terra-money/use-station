import { useState, useEffect } from 'react'
import { ChainConfig, ChainKey } from '../types'
import fcd from '../api/fcd'

export const Chains: {
  [key in ChainKey]: { name: string; hostname: string }
} = {
  columbus: { name: 'columbus-3', hostname: 'fcd.terra.dev' },
  vodka: { name: 'vodka-0001', hostname: 'vodka-fcd.terra.dev' },
  soju: { name: 'soju-0013', hostname: 'soju-fcd.terra.dev' },
  fitz: { name: 'fitz', hostname: 'fitz.terra.money:5562' }
}

export default (initial?: ChainKey): ChainConfig => {
  const [current, setCurrent] = useState<ChainKey | undefined>()

  const set = (chainKey: ChainKey) => {
    const { hostname } = getChain(chainKey)
    fcd.defaults.baseURL = `https://${hostname}`
    setCurrent(chainKey)
  }

  useEffect(() => {
    set(initial ?? 'columbus')
  }, [initial])

  const list: ChainKey[] = ['columbus', 'vodka', 'soju']

  return { current, list, set }
}

/* helper */
export const getChain = (chainKey: ChainKey) =>
  Chains[chainKey] ?? Chains['columbus']
