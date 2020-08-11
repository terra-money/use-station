import { useState, useEffect, useCallback } from 'react'
import { CurrencyConfig, Currency, Rate, API } from '../types'
import useFCD from '../api/useFCD'

export default (initial?: string): CurrencyConfig => {
  const { loading, data } = useRateKRT()
  const [current, setCurrent] = useState<Currency | undefined>()

  const list = data && [
    { key: 'ukrw', value: format('ukrw'), krwRate: '1' },
    ...data.filter(({ denom }) => denom !== 'uluna').map(convert)
  ]

  const set = useCallback(
    (key: string) => {
      const item = list?.find(item => item.key === key)
      setCurrent(item)
    },
    // eslint-disable-next-line
    [loading]
  )

  useEffect(() => {
    set(initial ?? 'uusd')
  }, [initial, set])

  return { current, list, loading, set }
}

/* helper */
const useRateKRT = (): API<Rate[]> => {
  const url = '/v1/market/swaprate/ukrw'
  const response = useFCD<Rate[]>({ url })
  return response
}

const format = (denom: string): string => denom.slice(1).toUpperCase()
const convert = ({ denom, swaprate }: Rate): Currency => ({
  key: denom,
  value: format(denom),
  krwRate: swaprate
})
