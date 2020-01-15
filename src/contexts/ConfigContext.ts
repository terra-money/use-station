import { Config, InitialConfigState } from '../types'
import createContext from './createContext'
import useLang from './useLang'
import useChain from './useChain'

export const [useConfig, ConfigProvider] = createContext<Config>()

export const useConfigState = (initial?: InitialConfigState): Config => {
  const lang = useLang(initial?.lang)
  const chain = useChain(initial?.chain)
  return { lang, chain }
}
