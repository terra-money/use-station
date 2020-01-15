import { ChainKey, FinderParams, FinderFunction } from '../types'
import { getChain } from '../contexts/useChain'
import { useConfig } from '../contexts/ConfigContext'

const FINDER = 'https://finder.terra.money'

const getLinkFrom = (current: ChainKey) => {
  const { name } = getChain(current)
  return ({ network, q, v }: FinderParams) =>
    `${FINDER}/${network ?? name}/${q}/${v}`
}

export default (): FinderFunction | undefined => {
  const { chain } = useConfig()
  const { current } = chain
  return current ? getLinkFrom(current) : undefined
}
