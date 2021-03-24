import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Depositor, DepositorsPage } from '../types'
import { DepositorsData } from '../types'
import { format, gt } from '../utils'
import useFinder from '../hooks/useFinder'
import useFCD from '../api/useFCD'
import { getVoter } from '../pages/governance/helpers'

const LIMIT = 5

export default (id: string): DepositorsPage => {
  const { t } = useTranslation()
  const getLink = useFinder()

  /* api */
  const [deposits, setDeposits] = useState<Depositor[]>([])
  const [offset, setOffset] = useState<number>()
  const [next, setNext] = useState<number>()
  const [done, setDone] = useState(false)

  const url = `/v1/gov/proposals/${id}/deposits`
  const params = { limit: LIMIT, offset }
  const response = useFCD<DepositorsData>({ url, params })
  const { data } = response

  useEffect(() => {
    if (data) {
      setDeposits((deposits) => [...deposits, ...data.deposits])
      setNext(data.next)
      setDone(data.deposits.length < LIMIT)
    }
  }, [data])

  const more = deposits.length && !done ? () => setOffset(next) : undefined

  /* render */
  const ui =
    !deposits || !gt(deposits.length, 0)
      ? { card: { content: t('Page:Governance:No deposits yet') } }
      : {
          more,
          table: {
            headings: {
              depositor: t('Page:Governance:Depositor'),
              displays: t('Common:Tx:Amount'),
            },

            contents: deposits.map(({ txhash, deposit, depositor }) => ({
              depositor: getVoter(depositor, getLink),
              displays: deposit.map((coin) => format.display(coin)),
            })),
          },
        }

  return { ...response, title: t('Page:Governance:Depositors'), ui }
}
