import { FinderParams, FinderFunction } from '../types'
import { useConfig } from '../contexts/ConfigContext'

const FINDER = 'https://finder.terra.money'

export default (): FinderFunction | undefined => {
  const { chain } = useConfig()
  const { name } = chain.current
  return ({ network, q, v }: FinderParams) =>
    `${FINDER}/${network ?? name}/${q}/${v}`
}
