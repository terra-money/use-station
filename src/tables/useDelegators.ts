import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DelegatorsPage, DelegatorsData, Delegator } from '../types'
import { format, gt, percent } from '../utils'
import useFCD from '../api/useFCD'
import useFinder from '../hooks/useFinder'

const LIMIT = 5

export default (address: string): DelegatorsPage => {
  const { t } = useTranslation()
  const getLink = useFinder()

  /* api */
  const [delegators, setDelegators] = useState<Delegator[]>([])
  const [offset, setOffset] = useState<number>()
  const [next, setNext] = useState<number>()
  const [done, setDone] = useState(false)

  const url = `/v1/staking/validators/${address}/delegators`
  const params = { limit: LIMIT, offset }
  const response = useFCD<DelegatorsData>({ url, params })
  const { data } = response

  useEffect(() => {
    if (data) {
      setDelegators((delegators) => [...delegators, ...data.delegators])
      setNext(data.next)
      setDone(data.delegators.length < LIMIT)
    }
  }, [data])

  const more = delegators.length && !done ? () => setOffset(next) : undefined

  /* render */
  const ui =
    !delegators || !gt(delegators.length, 0)
      ? {
          card: {
            content: t('Page:Staking:No delegators'),
          },
        }
      : {
          more,
          table: {
            headings: {
              address: t('Common:Account:Address'),
              display: t('Common:Tx:Amount'),
              weight: t('Common:Weight'),
            },

            contents: delegators.map(({ address, amount, weight }) => ({
              link: getLink!({ q: 'account', v: address }),
              address,
              display: format.display({ amount, denom: 'uluna' }),
              weight: percent(weight),
            })),
          },
        }

  return { ...response, title: t('Page:Staking:Delegators'), ui }
}
